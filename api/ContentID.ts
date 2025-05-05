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
        if (this.serialID === 'system') {
            return this.seasonID;
        }
        
        if (this.episodeID) return 'episodeID';
        if (this.seasonID) return 'seasonID';
        if (this.serialID) return 'serialID';
        
        return 'unkown';
    }
    
    isType(type: string): boolean {
        return this.getType() === type;
    }
    
    toString(parts = 3) {        
        return [this.serialID, this.seasonID, this.episodeID].slice(0, parts).join('-');
    }
    
    static parse(mockId: string) {        
        const args = mockId.split('-');
        const serialID: ContentIDArg = args[0]?.length ? args[0] : undefined;
        const seasonID: ContentIDArg = args[1]?.length ? args[1] : undefined;
        const episodeID: ContentIDArg = args[2]?.length ? args[2] : undefined;
        
        if (serialID !== 'system' && !Number(serialID)) {
            return new ContentID('system', serialID, undefined);
        }
        
        return new ContentID(serialID, seasonID, episodeID);
    }
    
    static updates() {
        return new ContentID('system', 'updates', undefined);
    }
    
    static favorites() {
        return new ContentID('system', 'favorites', undefined);
    }
}