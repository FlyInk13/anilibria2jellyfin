import { Database } from "bun:sqlite";

const createTable = `
    CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT,
        content_id TEXT
    )
`;

type FavoriteRow = {
    user_id: string;
    content_id: string;
};

type FavoriteItemSearch = { $userId: string, $contentId: string };

export class FavoriteRepository {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    static async init(path: string) {
        const db = new Database(path);
        db.run(createTable);
        return new FavoriteRepository(db);
    }

    getUserFavorites($userId: string): string[] {
        const query = `SELECT content_id FROM favorites WHERE user_id = $userId`;
        const result = this.db.query<FavoriteRow, { $userId: string }>(query).all({ $userId });

        return result.map(row => row.content_id);
    }

    isFavorite($userId: string, $contentId: string): boolean {
        const query = `SELECT COUNT(*) as count FROM favorites WHERE user_id = $userId AND content_id = $contentId`;
        const result = this.db.query<{ count: number }, FavoriteItemSearch>(query).get({ $userId, $contentId });
        return !!result && result.count > 0;
    }

    addFavorite($userId: string, $contentId: string): void {
        const query = `INSERT INTO favorites (user_id, content_id) VALUES ($userId, $contentId)`;
        this.db.query<any, FavoriteItemSearch>(query).run({ $userId, $contentId });
    }

    removeFavorite($userId: string, $contentId: string): void {
        const query = `DELETE FROM favorites WHERE user_id = $userId AND content_id = $contentId`;
        this.db.query<any, FavoriteItemSearch>(query).run({ $userId, $contentId });
    }
}
