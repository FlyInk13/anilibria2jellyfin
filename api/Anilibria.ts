import https from "node:https";
import type { ContentID } from "./ContentID";

// https://github.com/anilibria/docs/blob/master/api_v3.md#-franchiselist

type AnilibriaPoster = {
    url: string,
}

export type AnilibriaPlayerQuality = 'fhd' | 'hd' | 'sd';

export type AnilibriaPlayerItem = {
    "episode": number,
    "name": string|null,
    "uuid": string,
    "created_timestamp": number,
    "preview": string|null,
    "skips": {
      "opening": [
        
      ],
      "ending": [
        
      ]
    },
    "hls": Record<AnilibriaPlayerQuality, string>
  }

export type AnilibriaTitle = {
    "names": {
        "ru": string,
        "en": string,
        "alternative": null
    },
    id: number,
    description: string,
    posters: {
        original: AnilibriaPoster,
        small: AnilibriaPoster,
    },
    player: {
        host: string,
        list: Record<string, AnilibriaPlayerItem>
    }
}

export type AnilibriaList<T> = {
  list: T[],
}

export class Anilibria {
    public dlHost = 'dl-20240212-1.anilib.one';
    public staticHost = 'static-libria.weekstorm.one';

    host: string;
    cache: Record<string, any>;

  constructor(host: string) {
    this.host = host;
    this.cache = {};
  }

  titleUpdates(): Promise<AnilibriaList<AnilibriaTitle>> {
    return this.api('/v3/title/updates?limit=20');
  }

  titleSearch(q: string): Promise<AnilibriaList<AnilibriaTitle>> {
    return this.api('/v3/title/search?limit=20&search=' + encodeURIComponent(q));
  }

  async getImagePath(itemId: ContentID): Promise<[string, string]> {
    if (!itemId.serialID) {
        return Promise.resolve([this.staticHost, '/img/footer.png']);
    }
  
    const title = await this.title(itemId.serialID);
    if (itemId.seasonID && itemId.episodeID) {      
        const episodePreview = title.player.list[itemId.seasonID].preview;
        return [this.dlHost, episodePreview ?? title.posters.original.url];
    }

    if (itemId.seasonID) {      
      return [this.dlHost, title.posters.original.url];
    }

    return [this.dlHost, title.posters.small.url];
  }

  title(id: string): Promise<AnilibriaTitle> {
    return Promise.resolve().then(() => {
      if (this.cache[id] && this.cache[id].time < Date.now()) {
        return this.cache[id].data;
      }
      return this.api('/v3/title?id=' + id);
    }).then((res) => {
      this.cache[id] = {
        ttl: Date.now() + 10e3,
        data: res,
      };

      return res;
    })
  }


  async api(path: string) {
    const res = await this.get(this.host, path);
    return JSON.parse(res.toString());
  }

  get(host: string, path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = https.request({
        hostname: host,
        method: 'get',
        path: path,
        rejectUnauthorized: false
      });

      request.on('response', (proxyResponse) => {
        const data: Buffer[] = [];
        proxyResponse.on('data', (chunk: Buffer) => {
          data.push(chunk);
        }).on('end', () => {
          const body = Buffer.concat(data);
          resolve(body);
        }).on('error', (e) => {
          reject(e);
        });
      });

      request.end();
    })
  }
}

