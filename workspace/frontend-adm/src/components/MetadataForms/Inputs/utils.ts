import { formatDateTime } from 'components/Utils/DateTimeProcessor/utils';

export const generateLogsFileName = (componentName: string): string => `Логи ${componentName} за ${formatDateTime(new Date().toString(), {
        dateDivider: '-',
        dateTimeDivider: '_',
        timeDivider: '_',
    })}`;

export const restoreCursorPosition = (
    prevValue: string | null,
    newValue: string | null,
    savedPosition: number | null,
    delay: number = 5,
): void => {
    if (savedPosition === null) return;

    const activeInput = document.activeElement;
    if (!(activeInput instanceof HTMLInputElement)) return;
    const oldlength = prevValue?.length;
    const newLength = newValue?.length;
    let newPos = savedPosition;
    if (newLength && oldlength && newLength > oldlength && savedPosition === oldlength) {
        newPos = newLength;
    }
    setTimeout(() => {
        if (document.activeElement === activeInput && activeInput.value === newValue) {
            activeInput?.setSelectionRange(newPos, newPos);
        }
    }, delay);
};
