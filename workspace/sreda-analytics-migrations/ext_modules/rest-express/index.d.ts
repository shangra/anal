declare const _exports: ExpressWrapper;
export = _exports;
declare class ExpressWrapper {
    origin: typeof express;
    router: import('express-serve-static-core').Express;
    init(): void;
    start(req: any, res: any): this;
    disable(...args: any[]): this;
    use(...args: any[]): this;
    Router(): import('express-serve-static-core').Router;
}
import express = require('express');
//# sourceMappingURL=index.d.ts.map
