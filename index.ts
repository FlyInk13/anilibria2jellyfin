import express from 'express';
import url from 'node:url';
import { JellyFinAdapter } from './api/JellyFinAdapter';
import { ContentID } from './api/ContentID';
import { AnilibriaCached } from './api/AnilibriaCached';
import { proxy } from './lib/proxy';
import { FavoriteRepository } from './repository/Favorites';
import type { AnilibriaTitle, AnilibriaPlayerItem, AnilibriaPlayerQuality } from './api/Anilibria.types';

const app = express();
const jellyFinAdapter = new JellyFinAdapter();
const favoriteRepository = await FavoriteRepository.init(process.env.SQLITE_PATH ?? './data/data.sqlite');
const origin = process.env.ORIGIN ?? 'https://localhost/';
const port = process.env.PORT ?? 8888;
const anilibriaApi = new AnilibriaCached(
    process.env.ANILIBRIA_API ?? 'api.anilibria.tv',
    process.env.ANILIBRIA_DL  ?? 'static-libria.weekstorm.us',
    process.env.ANILIBRIA_DL  ?? 'static-libria.weekstorm.one',
);

// Log api and content requests
app.use((req, res, next) => {
    const pathname = url.parse(req.url).pathname ?? '';
    if (!/(Images\/Primary)|content/.test(pathname)) {
        console.debug('req', req.method, pathname, req.query);
    }

    next();
});

// Get Root Folder
app.get('/stable/Users/:userId/Views', (req, res) => {
    res.json(jellyFinAdapter.getList([
        jellyFinAdapter.getCollectionFolder(ContentID.updates(), 'Обновления'),
        jellyFinAdapter.getCollectionFolder(ContentID.favorites(), 'Избранное'),
    ], (folder) => folder));
});

app.post('/stable/Users/:userId/FavoriteItems/:itemId', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');
    const userId = req.params.userId;

    const isFavorite = favoriteRepository.isFavorite(userId, contentID.toString());
    if (isFavorite) {
        favoriteRepository.removeFavorite(userId, contentID.toString());
    } else {
        favoriteRepository.addFavorite(userId, contentID.toString());
    }

    return res.json(jellyFinAdapter.getEmptyList());
});


// Get title by search or folder by ID
app.get('/stable/Users/:userId/Items', (req, res, next) => {
    if (req.query.SearchTerm || req.query.NameStartsWith) {
        return anilibriaApi.titleSearch(String(req.query.SearchTerm || req.query.NameStartsWith)).then(({ list }) => {
            res.json(jellyFinAdapter.getList(list, (title: AnilibriaTitle) => {
                const contentID = ContentID.parse(title.id.toString());
                return jellyFinAdapter.getSerial(contentID, title)
            }));
        });
    }

    const parentId: ContentID = ContentID.parse(req.query.ParentId?.toString() ?? '');
    if (parentId.isType('favorites') || (req.query.Filters === 'IsFavorite' && req.query.IncludeItemTypes === 'Series')) {
        const userId = req.params.userId;
        const favoriteIds = favoriteRepository.getUserFavorites(userId);
        const titles = Promise.all(favoriteIds.map(itemId => {
            const contentID: ContentID = ContentID.parse(itemId);
            return anilibriaApi.title(contentID.serialID!);
        }));
        return titles.then((list) => {
            res.json(jellyFinAdapter.getList(list, (title: AnilibriaTitle) => {
                const contentID = ContentID.parse(title.id.toString());
                return jellyFinAdapter.getSerial(contentID, title)
            }));
        });
    } else if (parentId.isType('updates')) {
        return anilibriaApi.titleUpdates().then(({ list }) => {
            res.json(jellyFinAdapter.getList(list, (title: AnilibriaTitle) => {
                const contentID = ContentID.parse(title.id.toString());
                return jellyFinAdapter.getSerial(contentID, title)
            }));
        });
    }

    return res.json(jellyFinAdapter.getEmptyList());
});

app.get('/stable/Users/:userId/Items/:itemId', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');
    const userId = req.params.userId;

    if (contentID.isType('episodeID') && contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];
            res.json(jellyFinAdapter.getEpisode(contentID, title, episode));
        });
    }

    if (contentID.isType('serialID') && contentID.serialID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const mockID = ContentID.parse(title.id.toString());
            const isFavorite = favoriteRepository.isFavorite(userId, mockID.toString());
            res.json(jellyFinAdapter.getSerial(mockID, title, isFavorite));
        });
    }

    return res.json(jellyFinAdapter.getEmptyList());
});

app.use('/stable/Items/:itemId/PlaybackInfo', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.isType('episodeID') && contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];
            res.json({
                "MediaSources": jellyFinAdapter.getEpisode(contentID, title, episode).MediaSources,
                "PlaySessionId": contentID.toString(),
            });
        });
    }

    res.status(404).json({});
});


app.get('/stable/Shows/:itemId/Seasons', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.isType('serialID') && contentID.serialID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const releaseMap = title.franchises.reduce<Record<string, string>>((res, franchise) => {
                return franchise.releases.reduce<Record<string, string>>((res, release) => {
                    res[release.id.toString()] = release.names.ru;
                    return res;
                }, res)
            }, {});

            const releaseList = Object.entries(releaseMap).filter(x => x[0] !== contentID.serialID);
            releaseList.unshift([title.id.toString(), title.names.ru]);

            res.json(jellyFinAdapter.getList(releaseList, ([id, name]: [string, string]) => {
                const seasonID = new ContentID(id, '1', undefined);
                return jellyFinAdapter.getSeason(seasonID, name);
            }));
        });
    }

    res.json(jellyFinAdapter.getEmptyList());
});


app.get('/stable/Shows/:itemId/Episodes', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.query.SeasonId?.toString() ?? '');

    if (contentID.isType('seasonID') && contentID.serialID && contentID.seasonID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const items = Object.entries(title.player.list);
            res.json(jellyFinAdapter.getList(items, ([itemId, episode]: [string, AnilibriaPlayerItem]) => {
                const episodeID = new ContentID(title.id.toString(), '1', episode.episode.toString());
                return jellyFinAdapter.getEpisode(episodeID, title, episode)
            }));
        });
    }

    res.json(jellyFinAdapter.getEmptyList());
});

// Get stream content
const redirectM3U8 = (playlist: string): string => {
    const res = playlist.replace(/^(https?):\/\/(.+?)(\/.+)\.(.+)$/gm, (url) => {
        const [_, protocol, host, path, type] = url.match(/^(https?):\/\/(.+?)\/(.+)\.(.+)$/)!;
        return origin + 'content/' + protocol + '/' + host + '/' + type + '?path=' + encodeURIComponent(btoa(path));
    });

    return res;
}

// vidhub
// TODO: test infuse /stable/Videos/:itemId/stream
app.get('/stable/videos/:itemId/*', (req, res) => {
    const [qualityRaw, playlistType] = String(req.query.MediaSourceId ?? '').split('@');
    const qualityKey = qualityRaw as AnilibriaPlayerQuality;
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.isType('episodeID') && contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];
            const url = 'https://' + title.player.host + episode.hls[qualityKey];

            const urlRes = await fetch(url);
            const arrayBuffer = await urlRes.arrayBuffer();
            const decoder = new TextDecoder();
            let playlist = decoder.decode(arrayBuffer);

            if (playlistType === 'proxy') {
                playlist = redirectM3U8(playlist);
            }

            res.send(playlist);
            res.end();
        });
    }
});

app.get('/content/:protocol/:host/:type', async (req, res, next) => {
    const protocol: string = req.params.protocol;
    const host: string = req.params.host;
    const type: string = req.params.type;
    const path: string = req.query.path ? atob(String(req.query.path)) : '';
    const url = protocol + '://' + host + '/' + path + '.' + type;

    if (type === 'ts') {
        const urlRes = await fetch(url);
        console.debug(url, urlRes.url, urlRes.status, urlRes.headers);
        const arrayBuffer = await urlRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
    } else if (type === 'm3u8') {
        const urlRes = await fetch(url);
        const arrayBuffer = await urlRes.arrayBuffer();
        const decoder = new TextDecoder();
        const playlist = decoder.decode(arrayBuffer);
        const str = redirectM3U8(playlist);
        return res.send(str);
    }

    next();
})


// Get images
app.get('/stable/Items/:itemId/Images/Primary', (req, res) => {
    const contentID = ContentID.parse(req.params.itemId);

    anilibriaApi.getImagePath(contentID).then(([hostname, path]) => {
        proxy(req.method, hostname, path, res);
    }).catch((e) => {
        console.error(e);
        throw e;
    });
});

// Maybe TODO
app.get('/stable/Shows/NextUp', (req, res) => {
    res.json(jellyFinAdapter.getEmptyList());
});

// Mock data
app.post('/stable/Users/AuthenticateByName', (req, res) => {
    res.json(jellyFinAdapter.getAuthenticationResult());
});

app.get('/stable/System/Info/Public', (req, res) => {
    res.json(jellyFinAdapter.getPublicSystemInfo());
});

app.get('/stable/Plugins', (req, res) => {
    res.json(jellyFinAdapter.getEmptyArray());
});

app.get('/stable/Packages', (req, res) => {
    res.json(jellyFinAdapter.getEmptyArray());
});

app.get('/stable/DisplayPreferences/usersettings', (req, res) => {
    res.json(jellyFinAdapter.getDisplayPreferencesDto());
});

app.get('/stable/Users/:userId/GroupingOptions', (req, res) => {
    res.json(jellyFinAdapter.getEmptyArray());
});

app.get('/stable/Persons', (req, res) => {
    res.json(jellyFinAdapter.getEmptyList());
});

app.get('/stable/Library/VirtualFolders', (req, res) => {
    res.json(jellyFinAdapter.getEmptyArray());
});

app.get('/stable/Users/:userId', (req, res) => {
    res.json(jellyFinAdapter.getUserDto());
});

// proxy missing requests
app.use((req, res, next) => {
    console.warn(404, req.method, req.url);
    next();
});

app.listen(port, () => {
    console.info('Server listen port', port);
});