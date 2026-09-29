import { DeviceUUID } from 'device-uuid';

export default function getDevice() {
    const du = new DeviceUUID().parse();
    const dua = [
        // du.language,
        du.browser,
        du.platform,
        du.os,
        du.cpuCores,
        du.isAuthoritative,
        du.silkAccelerated,
        du.isKindleFire,
        du.isDesktop,
        du.isMobile,
        du.isTablet,
        du.isWindows,
        du.isLinux,
        du.isLinux64,
        du.isMac,
        du.isiPad,
        du.isiPhone,
        du.isiPod,
        du.isSmartTV,
        // du.pixelDepth,
        du.isTouchScreen,
    ];
    const id = du.hashMD5(dua.join(':'));
    return { ...du, id };
}
