export = checkAccess;
/**
 * @param {string[]} accessRules
 * @param {boolean} [oneOf]
 * @returns
 */
declare function checkAccess(
    accessRules: string[],
    oneOf?: boolean
): (req: any, res: any, next: any) => void;
//# sourceMappingURL=checkAccess.d.ts.map
