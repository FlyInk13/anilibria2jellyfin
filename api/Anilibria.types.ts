export type AnilibriaPoster = {
    url: string,
    raw_base64_file: null|string,
}

export type AnilibriaPlayerQuality = 'fhd' | 'hd' | 'sd';

export type AnilibriaPlayerItem = {
    "episode": number,
    "name": string|null,
    "uuid": string,
    "created_timestamp": number,
    "preview": string|null,
    "skips": Record<string, [number, number]|[]>,
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
        "id": string, // "e7c5c2ef-a205-4ab6-9773-e6565b21af7b",
        "name": string, // "Созданный в Бездне"
    },
    "releases": AnilibriaRelease[],
}

export type AnilibriaTitle = {
    year: number | null | undefined;
    id: number,
    code: string,
    names: {
        ru: string,
        en: string,
        alternative: null,
    },
    description: string,
    updated: number,
    last_change: number,
    status: {
        string: string,
        code: AnilibriaTitleStatusCode,
    },
    posters: {
        original?: AnilibriaPoster,
        medium?: AnilibriaPoster,
        small?: AnilibriaPoster,
    },
    franchises: AnilibriaFranchise[],
    player: {
        alternative_player: null,
        is_rutube: boolean,
        host: string,
        list: Record<string, AnilibriaPlayerItem>,
        rutube: {},
        episodes: {
            first: number,
            last: number,
            string: string,
        },
    }
}

export type AnilibriaList<T> = {
    list: T[],
}

export type AnilibriaCache<T> = {
    ttl: number,
    data: T,
}