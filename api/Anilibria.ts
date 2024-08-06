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

export enum AnilibriaTitleStatusCode {
  IN_PROGRESS = 1, // 1 – В работе
  SEASON_DONE = 2, // 2 – Завершен
  HIDDEN      = 3, // 3 – Скрыт
  TITLE_DONE  = 4, // 4 – Неонгоинг
}

export type AnilibriaRelease = {
  "id": number,
  "code": string,
  "ordinal": number,
  "names": {
    "ru": string,
    "en": string,
    "alternative": null
  }
}

export type AnilibriaFranchise = {
  "franchise": {
    "id": "e7c5c2ef-a205-4ab6-9773-e6565b21af7b",
    "name": "Созданный в Бездне"
  },
  "releases": AnilibriaRelease[],
}

export type AnilibriaTitle = {
  year: number | null | undefined;
  id: number,
  names: {
      "ru": string,
      "en": string,
      "alternative": null
  },
  description: string,
  updated: number,
  last_change: number,
  status: {
    code: AnilibriaTitleStatusCode,
  },
  posters: {
      original: AnilibriaPoster,
      small: AnilibriaPoster,
  },
  franchises: AnilibriaFranchise[],
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
    return this.api('/v3/title/updates?limit=10');
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
        const episodePreview = title.player.list[itemId.seasonID] ? title.player.list[itemId.seasonID].preview : undefined;
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


  async api(path: string, canRetry = true): Promise<any> {
    const res = await fetch('https://' + this.host + path);
    return await res.json().catch(async (e) => {
      if (canRetry) {
        await new Promise(r => setTimeout(r, 500));
        return await this.api(path, false);
      }

      throw e;
    }).then((r) => {
      if (r && r.error) {
        console.error(path, r);
        throw r;
      }

      return r;
    });
  }
}

