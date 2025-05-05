import type { AnilibriaTitle, AnilibriaList } from "./Anilibria.types";
import type { ContentID } from "./ContentID";

// https://github.com/anilibria/docs/blob/master/api_v3.md#-franchiselist
export class Anilibria {
    public apiHost: string;
    public dlHost: string;
    public staticHost: string;

    constructor(apiHost: string, dlHost: string, staticHost: string) {
        this.apiHost = apiHost;
        this.dlHost = dlHost;
        this.staticHost = staticHost;
    }


    async titleUpdates(): Promise<AnilibriaList<AnilibriaTitle>> {
        // https://api.anilibria.tv/v3/title/updates?limit=20
        return await this.api('/v3/title/updates?limit=20');
    }

    async titleSearch(q: string): Promise<AnilibriaList<AnilibriaTitle>> {
        return await this.api('/v3/title/search?limit=20&search=' + encodeURIComponent(q));
    }

    async getImagePath(itemId: ContentID): Promise<[string, string]> {
        console.log('GetImage', itemId.toString())

        if (itemId.isType('updates')) {
            return Promise.resolve([this.staticHost, '/img/footer.png']);
        }

        if (itemId.isType('favorites')) {
            return Promise.resolve([this.staticHost, '/img/footer.png']);
        }

        if (!itemId.serialID) {
            throw new Error('serialID is required');
        }

        const title = await this.title(itemId.serialID);
        const poster = Object.values(title.posters)[0];
        if (!poster) {
            console.warn(itemId.toString(), 'empty poster');
            return Promise.resolve([this.staticHost, '/img/footer.png']);
        }

        if (itemId.seasonID && itemId.episodeID) {
            const episodePreview = title.player.list[itemId.episodeID] ? title.player.list[itemId.episodeID].preview : undefined;
            return [this.dlHost, episodePreview ?? poster.url];
        }

        return [this.dlHost, poster.url];
    }

    async title(id: string): Promise<AnilibriaTitle> {
        return await this.api('/v3/title?id=' + id);
    }


    protected async api(path: string): Promise<any> {
        const res = await fetch('https://' + this.apiHost + path);
        return await res.json().then((r) => {
            if (r && r.error) {
                console.error(path, r);
                throw r;
            }

            return r;
        });
    }
}

