import { Request } from 'express';
import { StorageEngine } from 'multer';

export interface ChunkStorageEngine extends StorageEngine {
    stat(
        req: Request,
        filename: string,
        callback: (error?: any, info?: Partial<Express.Multer.File>) => void
    ): void;
    list(req: Request, pattern: string, callback: (error?: any, info?: string[]) => void): void;
    read(req: Request, filename: string, callback: (error?: any, info?: Buffer) => void): void;
    del(req: Request, filename: string, callback: (error?: any) => void): void;
}
