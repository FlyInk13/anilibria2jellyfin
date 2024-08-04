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

    if (req.query.NameStartsWith) {
        return jellyFinAdapter.getEmptyList();
    }

    if (req.query.SearchTerm) {
        return anilibriaApi.titleSearch(String(req.query.SearchTerm)).then(({ list }) => {
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
app.get('/stable/videos/:itemId/stream.m3u8', (req, res) => {
    const qualityKey = req.query.MediaSourceId as AnilibriaPlayerQuality; 
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const episode = title.player.list[contentID.episodeID!];            
            const url = episode.hls[qualityKey];
            proxy(req.method, title.player.host, url, res);
        });
    }
});

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