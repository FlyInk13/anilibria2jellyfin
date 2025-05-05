import { Anilibria } from "./Anilibria";
import type { AnilibriaCache, AnilibriaTitle, AnilibriaList } from "./Anilibria.types";

// https://github.com/anilibria/docs/blob/master/api_v3.md#-franchiselist
export class AnilibriaCached extends Anilibria {
    cacheTime = (10 * 60e3);
    cache: Record<string, AnilibriaCache<AnilibriaTitle>> = {};
    updatesCache: AnilibriaCache<AnilibriaList<AnilibriaTitle>> = {
        ttl: 0,
        data: {
            list: [],
        }
    };

    constructor(apiHost: string, dlHost: string, staticHost: string) {
        super(apiHost, dlHost, staticHost);

        this.updatesCache.data.list.forEach((item: AnilibriaTitle) => {
            this.setTitleCache(item);
        });

        this.titleUpdates(false).catch((e) => {
            console.error(e);
        });
    }

    setTitleCache(item: AnilibriaTitle) {
        this.cache[item.id] = {
            ttl: Date.now() + this.cacheTime,
            data: item,
        };
    }

    async titleUpdates(useCache = true): Promise<AnilibriaList<AnilibriaTitle>> {
        if (useCache && this.updatesCache.ttl > Date.now()) {
            return this.updatesCache.data;
        }

        const { list } = await super.titleUpdates().then((res) => {
            res.list.forEach((item: AnilibriaTitle) => {
                this.setTitleCache(item);
            });

            this.updatesCache = {
                ttl: Date.now() + this.cacheTime,
                data: res,
            };

            return res;
        }).catch((e) => {
            // anilibria частенько лежит, отдаем кеш, если у них все лежит
            console.error(e);
            return this.updatesCache.data;
        })


        return { list };
    }

    async titleSearch(q: string): Promise<AnilibriaList<AnilibriaTitle>> {
        const { list } =  await super.titleSearch(q);

        list.forEach((item: AnilibriaTitle) => {
            this.setTitleCache(item);
        });

        return { list };
    }

    async title(id: string): Promise<AnilibriaTitle> {
        if (this.cache[id] && this.cache[id].ttl > Date.now()) {
            return this.cache[id].data;
        }

        return await super.title(id).then((item) => {
            this.setTitleCache(item);
            return item;
        }).catch(e => {
            // anilibria частенько лежит, отдаем кеш, если у них все лежит
            console.error('GetTitle Error', e);
            if (this.cache[id]) {
                return this.cache[id].data;
            }

            throw e;
        });
    }

}

