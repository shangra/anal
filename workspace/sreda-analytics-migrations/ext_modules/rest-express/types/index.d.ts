import { Router } from 'express';
import { ApplicationRequestHandler } from 'express-serve-static-core';

declare module '../rest-express' {
    declare global {
        interface IRestWrapper {
            use: ApplicationRequestHandler;
            Router: Router;
        }

        interface ISredaCore {
            rest: IRestWrapper;
        }

        var wrapper: TWrapper;
        var sreda: ISredaCore;
    }
}
