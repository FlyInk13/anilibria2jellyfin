type ContentIDArg = string|undefined;


export class ContentID {
    serialID: ContentIDArg;
    seasonID: ContentIDArg;
    episodeID: ContentIDArg;

    constructor(serialID: ContentIDArg, seasonID: ContentIDArg, episodeID: ContentIDArg) {
        this.serialID  = serialID;
        this.seasonID  = seasonID;
        this.episodeID = episodeID;
    }

    getType() {
        if (this.episodeID) return 'serialID';
        if (this.seasonID) return 'seasonID';
        if (this.episodeID) return 'episodeID';
        return 'root';
    }

    toString(parts = 3) {        
        return [this.serialID, this.seasonID, this.episodeID].slice(0, parts).join('-');
    }

    static parse(mockId: string) {        
        const args = mockId.split('-');
        const serialID: ContentIDArg = args[0]?.length ? args[0] : undefined;
        const seasonID: ContentIDArg = args[1]?.length ? args[1] : undefined;
        const episodeID: ContentIDArg = args[2]?.length ? args[2] : undefined;
        
        return new ContentID(serialID, seasonID, episodeID);
    }

    static root() {
        return new ContentID(undefined, undefined, undefined);
    }
}