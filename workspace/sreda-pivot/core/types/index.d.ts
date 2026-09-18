import { TWrapper } from '../wrapper';
import { Model, ModelStatic } from 'sequelize';
import { AssociateMethods } from '../db/rls/types';
import Extensions from '../class/Extensions.class';

declare global {
    interface ISetOptions {
        /**
         * Метка в милисекундах, сколько жить ключу
         */
        ttl?: number;
    }

    interface IMemorySave {
        isExternal: boolean;
        init(): Promise<void>;
        get(key: string): Promise<any>;
        set(key: string, value: any, options: ISetOptions): Promise<void>;
        del(key: string | RegExp): Promise<number>;
    }

    export interface IRestWrapper {
        origin: any;
        start(req, res);
        disable(...args);
        use(...args);
        Router();
    }

    export interface IHook {
        info: {
            class: {};
            function: string;
            once: boolean;
        };
        hook: Function;
    }

    export type TSredaEnv = Record<string, any> & {
        NODE_ENV: 'production' | 'development' | 'psi' | 'test';
        VAR: string | 'var';
    };

    export interface IServerInfo {
        connections: Map;
    }

    export interface ISredaCore {
        restmodule: IRestWrapper;
        memorysave: IMemorySave;
        env: TSredaEnv;
        models: Record<string, ModelStatic<Model> & AssociateMethods>;
        hooks: Record<string, IHook[]>;
        versions: Record<string, string>;
        server: IServerInfo;
    }

    var wrapper: TWrapper;
    var sreda: ISredaCore;
}

export {};
