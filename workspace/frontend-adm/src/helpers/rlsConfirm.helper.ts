import type { FormSchema, FormValues } from 'components/Inspector/types';

/**
 * Признак «галку RLS сняли в этой правке»: раньше флаг был включён,
 * в текущих значениях формы он выключен. Обновление схемы = update-форма.
 */
export function isRlsTurnedOff(form: FormSchema | undefined, values: FormValues): boolean {
    if (form?.type !== 'update' || !form.data?.rls) return false;
    const raw = (values as Record<string, unknown>).rls;
    const rlsNowOn = !(raw === false || raw === 'false' || raw === 0 || raw === '0');
    return !rlsNowOn;
}

/** Таблица грантов удаляется вместе с выданными грантами — отсюда подтверждение. */
export function rlsDropConfirmText(table: string): string {
    return `Таблица ${table}__rls будет удалена вместе с выданными грантами. Продолжить?`;
}
