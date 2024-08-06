import crypto from 'node:crypto';

export const md5 = (data: string): string => crypto.createHash('md5').update(data).digest("hex");