export = MetaCubeInfoService;
/**
 * @typedef {import('./types/Button')} Button
 */
declare class MetaCubeInfoService extends Extensions {
    /**
     * @param {{ buttons?: Button[] }} innerResult
     * @param {{ id?: string }} functionInput
     * @returns
     */
    formAfter(
        innerResult: {
            buttons?: Button[];
        },
        functionInput: {
            id?: string;
        }
    ): Promise<{
        buttons?: Button[];
    }>;
}
declare namespace MetaCubeInfoService {
    export { Button };
}
import Extensions = require('../../../core/class/Extensions.class');
type Button = typeof import('./types/Button');
//# sourceMappingURL=MetaCubeInfo.service.d.ts.map
