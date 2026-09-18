import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdapterAPI, usePluginState } from '../../../../AdapterSpreadSheet/plugin/context/AdapterContext';
import ChartGenerationCMP from '../../../../ChartGenerationCMP';
import { getLineComputedData } from '../../../../ChartGenerationCMP/src/utils';
import $windows from '../../../../ui/windows.helper';
import { PLUGIN_CHART_GENERATION_KEY, PLUGIN_CHART_GENERATION_MODAL_STEPS } from '../../constants';
import { PluginChartGenerationState } from '../../types';
import { EditChartForm } from '../EditChartForm';
import styles from './styles.module.css';
import { ChartWindowMeta, ChartWindowProps } from './types';

/**
 * Компонент окна графика.
 *
 * Данные читаются напрямую из plugin state через usePluginState —
 * никакого HooksManager, никаких подписок.
 *
 * Жизненный цикл:
 *  - Монтируется через $windows.open() в PluginChartGeneration._handleCreateChart
 *  - Автоматически закрывается, когда его uuid исчезает из state.charts
 */
export const ChartWindow: FC<ChartWindowProps> = ({ uuid, spreadSheetId }) => {
    const { dispatch } = useAdapterAPI();
    const state = usePluginState<PluginChartGenerationState>(PLUGIN_CHART_GENERATION_KEY);

    const [step, setStep] = useState(PLUGIN_CHART_GENERATION_MODAL_STEPS.MENU);

    // ── Данные и мета ─────────────────────────────────────────────────────────

    /**
     * Конвертируем LineComputedDataProps -> ChartValues только при изменении chartData.
     * Это единственное место конвертации — раньше вызывалось N раз (по числу графиков).
     */
    const chartValues = useMemo(() => (state?.chartData ? getLineComputedData(state.chartData) : []), [state?.chartData]);

    const chartMeta = state?.charts[uuid]?.meta ?? null;

    // ── Автозакрытие при удалении из state ───────────────────────────────────

    useEffect(() => {
        if (!state?.charts?.[uuid]) {
            $windows.close(uuid);
        }
    }, [state?.charts, uuid]);

    // ── Обработчики ───────────────────────────────────────────────────────────

    const handleMetaUpdate = useCallback(
        (meta: ChartWindowMeta) => {
            dispatch({ type: 'CHART_META_UPDATE', payload: { uuid, meta } });
            setStep(PLUGIN_CHART_GENERATION_MODAL_STEPS.MENU);
        },
        [dispatch, uuid],
    );

    const handleClose = useCallback(() => {
        dispatch({ type: 'CHART_REMOVE', payload: { uuid } });
        $windows.close(uuid);
    }, [dispatch, uuid]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (step === PLUGIN_CHART_GENERATION_MODAL_STEPS.EDIT) {
        return (
            <EditChartForm
                meta={chartMeta ?? { type: 'line', meta: {} as any }}
                spreadSheetId={spreadSheetId}
                onSubmit={handleMetaUpdate}
                onClose={() => setStep(PLUGIN_CHART_GENERATION_MODAL_STEPS.MENU)}
            />
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles['chart-container']}>
                <div className={styles['chart-content']}>
                    <ChartGenerationCMP type={chartMeta?.type ?? 'line'} meta={chartMeta?.meta} chartValues={chartValues} />
                </div>
            </div>
            <button
                type="button"
                className={styles['edit-button']}
                onClick={() => setStep(PLUGIN_CHART_GENERATION_MODAL_STEPS.EDIT)}
            >
                Настроить
            </button>
        </div>
    );
};
