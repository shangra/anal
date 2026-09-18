export = ReportsController;
/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */
/**
 * @swagger
 * tags:
 *   - name: reportsCMP
 *     description: расширение
 */
declare class ReportsController {
    /**
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    static getTableData(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    static getTableDataResults(req: Request, res: Response, next: NextFunction): Promise<void>;
}
declare namespace ReportsController {
    export { Request, Response, NextFunction };
}
type Request = import("express").Request;
type Response = import("express").Response;
type NextFunction = import("express").NextFunction;
//# sourceMappingURL=Reports.controller.d.ts.map