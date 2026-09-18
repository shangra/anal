import { PluginStatesMap } from '../Plugin';
import { Transaction } from './Transaction';

export interface VetoEntry {
    /** Причина блокировки. */
    reason: string;
    /** Ключ плагина-блокировщика. */
    source: string;
}

/**
 * Контекст, передаваемый на Phase 2.
 * resolveVetoes мутирует vetoes напрямую — удаляет записи, которые снимает.
 */
export interface VetoContext {
    tr: Transaction;
    /** Read-only снапшот состояния всех плагинов на момент фильтрации. */
    readonly state: Readonly<PluginStatesMap>;
    /** Активные вето. Мутируется плагинами в Phase 2. */
    vetoes: Map<string, VetoEntry>;
}
