export = worker_codeService;
declare class worker_codeService {
    constructor(fileOrCode: any);
    file: any;
    run(func: any, ...args: any[]): Promise<any>;
    start(code: any, ...args: any[]): Promise<any>;
}
//# sourceMappingURL=worker_code.service.d.ts.map