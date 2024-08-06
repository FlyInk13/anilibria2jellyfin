import express from 'express';
import url from 'node:url';
import { JellyFinAdapter } from './api/JellyFinAdapter';
import { ContentID } from './api/ContentID';
import { Anilibria, type AnilibriaPlayerItem, type AnilibriaPlayerQuality, type AnilibriaTitle } from './api/Anilibria';
import { proxy } from './lib/proxy';
import { md5 } from './lib/md5';

const app = express();
const jellyFinAdapter = new JellyFinAdapter();
const anilibriaApi = new Anilibria('api.anilibria.tv');

// Log api and content requests
app.use((req, res, next) => {
    const pathname = url.parse(req.url).pathname ?? '';
    if (!/(Images\/Primary)|content/.test(pathname)) {
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

    return res.json(jellyFinAdapter.getEmptyList());
});

app.get('/stable/Users/:userId/Items/:itemId', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const torrentInfo = title.torrents.list.find(torrent => torrent.torrent_id.toString() === contentID.seasonID)!;
            const torrentEngine = await anilibriaApi.getTorrent(torrentInfo.magnet);
            const file = torrentEngine.files.find(file => md5(file.name) === contentID.episodeID)!;
            const episodeID = new ContentID(title.id.toString(), torrentInfo.torrent_id.toString(), md5(file.name));
            const episode = jellyFinAdapter.getEpisode(episodeID, file.name, file.path, Date.now()); // todo fix date
            res.json(episode);
        });
    }
    
    if (contentID.serialID && /^\d+$/.test(contentID.serialID)) {
        return anilibriaApi.title(contentID.serialID).then((title: AnilibriaTitle) => {
            const mockID = ContentID.parse(title.id.toString());
            res.json(jellyFinAdapter.getSerial(mockID, title));
        });
    }

    return res.json(jellyFinAdapter.getEmptyList());
});

app.use('/stable/Items/:itemId/PlaybackInfo', (req, res, next) => {    
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const torrentInfo = title.torrents.list.find(torrent => torrent.torrent_id.toString() === contentID.seasonID)!;
            const torrentEngine = await anilibriaApi.getTorrent(torrentInfo.magnet);
            const file = torrentEngine.files.find(file => md5(file.name) === contentID.episodeID)!;
            const episodeID = new ContentID(title.id.toString(), torrentInfo.torrent_id.toString(), md5(file.name));
            const episode = jellyFinAdapter.getEpisode(episodeID, file.name, file.path, Date.now()); // todo fix date

            res.json({ 
                "MediaSources": episode.MediaSources,
                "PlaySessionId": contentID.toString(),
            });
        });
    }

    res.status(404).json({});
});


app.get('/stable/Shows/:itemId/Seasons', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const releaseList = title.torrents.list.map<[string, string]>((torrent) => {
                const id = torrent.torrent_id.toString();
                const name = torrent.episodes.string + ' ' +  torrent.quality.string;
                return [id, name];
            });

            res.json(jellyFinAdapter.getList(releaseList, ([id, name]: [string, string]) => {
                const seasonID = new ContentID(contentID.serialID, id, undefined);
                return jellyFinAdapter.getSeason(seasonID, name);
            }));
        });
    }

    res.json(jellyFinAdapter.getEmptyList());
});


app.get('/stable/Shows/:itemId/Episodes', (req, res, next) => {
    const contentID: ContentID = ContentID.parse(req.query.SeasonId?.toString() ?? '');

    if (contentID.serialID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const torrentInfo = title.torrents.list.find(torrent => torrent.torrent_id.toString() === contentID.seasonID)!;
            const torrentEngine = await anilibriaApi.getTorrent(torrentInfo.magnet);

            res.json(jellyFinAdapter.getList(torrentEngine.files, (file: TorrentStream.TorrentFile) => {
                const episodeID = new ContentID(title.id.toString(), torrentInfo.torrent_id.toString(), md5(file.name));
                return jellyFinAdapter.getEpisode(episodeID, file.name, file.path, Date.now()); // todo fix date
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

// infuse
app.get('/stable/Videos/:itemId/stream', (req, res) => {
    const contentID: ContentID = ContentID.parse(req.params.itemId?.toString() ?? '');

    if (contentID.serialID && contentID.episodeID) {
        return anilibriaApi.title(contentID.serialID).then(async (title: AnilibriaTitle) => {
            const torrentInfo = title.torrents.list.find(torrent => torrent.torrent_id.toString() === contentID.seasonID)!;
            const torrentEngine = await anilibriaApi.getTorrent(torrentInfo.magnet);
            const file = torrentEngine.files.find(file => md5(file.name) === contentID.episodeID)!;
            console.log(torrentInfo);
            console.log(req.headers);
            
            res.status(200);

            let startByte = undefined;
            let endByte = undefined;
            const rangeHeader = req.get('range');
            console.log(rangeHeader);
            
            if (rangeHeader) {
              const range = rangeHeader.split('=')[1];
              const bytes = range.split('-');
              if (Number(bytes[0])) startByte = Number(bytes[0]);
              if (Number(bytes[1])) endByte = Number(bytes[1]);
            }
          
            if (!startByte) startByte = 0;
            if (!endByte) endByte = file.length; // Math.min(startByte + 10e3, file.length);
        
        
            console.log('filename:', file.name, file.length);
            console.log('range:', startByte, endByte);
        
            res.setHeader('Content-Length', endByte - startByte);
            console.log('Content-Length', endByte - startByte);
        
            res.setHeader('Content-Range', 'bytes ' + startByte + '-' + (endByte - 1) + '/' + file.length);
            console.log('Content-Range', 'bytes ' + startByte + '-' + (endByte - 1) + '/' + file.length);
        
            res.setHeader('Content-Type', 'video/x-matroska');
            // res.setHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
        
            const stream = file.createReadStream({
              start: startByte,
              end: endByte - 1
            });
            
            stream.on('data', (x: any) => {
              console.log('write', x.length);
              res.write(x);
            });
        
            stream.on('end', (x: any) => {
              console.log('end');
              res.end()
            });
            stream.on('error', (x: any) => {
              console.log('error', x);
              res.end()
            });
        
            req.on('close', () => {
              console.log('connection closed');
              if (file) file.deselect();
              torrentEngine.destroy(() => {
                console.log('torrent removed');
              });
            });
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
        console.log(url, urlRes.url, urlRes.status, urlRes.headers);
        const arrayBuffer = await urlRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
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
    console.log(404, req.method, req.url);
    next();
});

app.listen(8888);