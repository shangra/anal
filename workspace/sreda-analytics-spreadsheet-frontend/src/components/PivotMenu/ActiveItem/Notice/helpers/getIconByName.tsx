import { AccessLockIcon, ButtonColors, ErrorIcon, IconButton, SettingWrenchIcon, SuccessIcon } from 'ui-kit';

export const getIconButtonByName = (icon: string, color: ButtonColors) => {
    // Обратная совместимость
    switch (color) {
        // @ts-expect-error
        case 'green':
            color = 'success';
            break;
        // @ts-expect-error
        case 'yellow':
            color = 'warning';
            break;
        // @ts-expect-error
        case 'red':
            color = 'error';
            break;
    }

    switch (icon) {
        case 'bi-exclamation-lg': // Обратная совместимость
        case 'AccessLockIcon':
            return <IconButton icon={AccessLockIcon} size="small" color={color} variant="text" />;
        case 'bi-check': // Обратная совместимость
        case 'SuccessIcon':
            return <IconButton icon={SuccessIcon} size="small" color={color} variant="text" />;
        case 'bi-x': // Обратная совместимость
        case 'ErrorIcon':
            return <IconButton icon={ErrorIcon} size="small" color={color} variant="text" />;
        case 'bi-tools': // Обратная совместимость
        case 'SettingWrenchIcon':
            return <IconButton icon={SettingWrenchIcon} size="small" color={color} variant="text" />;
        default:
            return null;
    }
};
