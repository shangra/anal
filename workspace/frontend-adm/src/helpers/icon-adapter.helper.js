import {
    CalculateIcon,
    CopyIcon,
    DefaultIcon,
    ElectricityIcon,
    EraseIcon,
    ResetIcon,
    SettingIcon,
    UpdateIcon,
    UploadIcon,
} from 'ui-kit';

export function getNewIcon(iconName) {
    const icon = iconName.split(' ').find((item) => item.startsWith('bi-'));

    switch (icon) {
        case 'bi-box-arrow-up':
            return UploadIcon;
        case 'bi-repeat':
            return UpdateIcon;
        case 'bi-fire':
            return EraseIcon;
        case 'bi-calculator':
            return CalculateIcon;
        case 'bi-copy':
            return CopyIcon;
        case 'bi-arrow-counterclockwise':
            return ResetIcon;
        case 'bi-ethernet':
            return ElectricityIcon;
        case 'bi-cursor-fill':
            return SettingIcon;
        default:
            return DefaultIcon;
    }
}
