import express from 'express';
import url from 'node:url';
import { JellyFinAdapter } from './api/JellyFinAdapter';
import { ContentID } from './api/ContentID';
import { Anilibria, type AnilibriaPlayerItem, type AnilibriaPlayerQuality, type AnilibriaTitle } from './api/Anilibria';
import { proxy } from './lib/proxy';

const app = express();
const jellyFinAdapter = new JellyFinAdapter();
const anilibriaApi = new Anilibria('api.anilibria.tv');

// Log api and content requests
app.use((req, res, next) => {
    const pathname = url.parse(req.url).pathname ?? '';
    if (!/Images\/Primary/.test(pathname)) {
        console.log('req', req.method, pathname, req.query);
    }

    next();
});

// Get Root Folder
app.get('/stable/Users/:userId/Views', (req, res) => {
    res.json(jellyFinAdapter.getRoot());
});

// Get title by search or ID
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
    if (!parentId.serialID) {
        return anilibriaApi.titleUpdates().then(({ list }) => {
            res.json(jellyFinAdapter.getList(list, (title: AnilibriaTitle) => {
                const contentID = ContentID.parse(title.id.toString());
                return jellyFinAdapter.getSerial(contentID, title)
            }));
        });
    }

    return jellyFinAdapter.getEmptyList();
});

app.get('/stable/Users/:userId/Items/:itemId', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];            
            res.json(jellyFinAdapter.getEpisode(contentID, title, episode));
        });
    } 
    
    if (contentID.serialID && /^\d+$/.test(contentID.serialID)) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const mockID = ContentID.parse(title.id.toString());
            res.json(jellyFinAdapter.getSerial(mockID, title));
        });
    }

    res.status(404).json({});
});

app.post('/stable/Items/:itemId/PlaybackInfo', (req, res, next) => {    
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
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

    if (contentID.serialID) {
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

    if (contentID.serialID && contentID.seasonID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const items = Object.entries(title.player.list);
            res.json(jellyFinAdapter.getList(items, ([itemId, episode]: [string, AnilibriaPlayerItem]) => {
                const episodeID = new ContentID(title.id.toString(), itemId, episode.episode.toString());                    
                return jellyFinAdapter.getEpisode(episodeID, title, episode)
            }));
        });
    }

    res.json(jellyFinAdapter.getEmptyList());
});

// Get stream content
const redirectM3U8 = (origin: string, playlist: string): string => {
    return playlist.replace(/^(https?):\/\/(.+?)(\/.+)\.(.+)$/gm, (url) => {
        const [_, protocol, host, path, type] = url.match(/^(https?):\/\/(.+?)\/(.+)\.(.+)$/)!;
        return origin + '/content/' + protocol + '/' + host + '/' + type + '?path=' + encodeURIComponent(btoa(path));
    });
}

app.get('/stable/videos/:itemId/stream.m3u8', (req, res) => {
    const [qualityRaw, playlistType] = String(req.query.MediaSourceId ?? '').split('@');
    const qualityKey = qualityRaw as AnilibriaPlayerQuality; 
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];            
            const url = 'https://' + title.player.host + episode.hls[qualityKey];

            const urlRes = await fetch(url);
            const arrayBuffer = await urlRes.arrayBuffer();
            const origin = 'http://' + req.get('host')!;
            const decoder = new TextDecoder();
            let playlist = decoder.decode(arrayBuffer);
            
            if (playlistType === 'proxy') {
                playlist = redirectM3U8(origin, playlist);
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
        const arrayBuffer = await urlRes.arrayBuffer();
        const nodeBuffer = Buffer.from(arrayBuffer);
        return res.send(nodeBuffer);
    } else if (type === 'm3u8') {
        const urlRes = await fetch(url);
        const arrayBuffer = await urlRes.arrayBuffer();
        const origin = 'http://' + req.get('host')!;
        const decoder = new TextDecoder();
        const playlist = decoder.decode(arrayBuffer);
        const str = redirectM3U8(origin, playlist);
        return res.send(str);
    }

    next();
})


// Get images
app.get('/stable/Items/:itemId/Images/Primary', (req, res) => {
    const contentID = ContentID.parse(req.params.itemId);
  
    anilibriaApi.getImagePath(contentID).then(([hostname, path]) => {
        proxy(req.method, hostname, path, res);
    });
});

// Maybe TODO
app.get('/stable/Users/:userId/Items', (req, res) => {
    res.json(jellyFinAdapter.getEmptyList());
});

app.get('/stable/Shows/NextUp', (req, res) => {
    res.json(jellyFinAdapter.getEmptyList());
});

app.get('/stable/Users/:userId/Items/Latest', (req, res) => {
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

app.get('/stable/Library/VirtualFolders', (req, res) => {
    res.json(jellyFinAdapter.getEmptyArray());
});

app.get('/stable/Users/:userId', (req, res) => {
    res.json(jellyFinAdapter.getUserDto());
});

// proxy missing requests
app.use((req, res, next) => {
    console.log(404, req.method, req.url);
    next();
});

app.listen(8888);