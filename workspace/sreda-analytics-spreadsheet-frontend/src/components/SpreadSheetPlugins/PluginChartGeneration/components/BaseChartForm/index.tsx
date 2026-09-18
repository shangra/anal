import { joiResolver } from '@hookform/resolvers/joi';
import { FC, FocusEvent, RefObject, useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from 'ui-kit';

import { usePluginState } from '../../../../AdapterSpreadSheet/plugin/context/AdapterContext';
import { CHART_TYPE } from '../../../../ChartGenerationCMP/src';
import { PLUGIN_CURSOR_CELL_KEY } from '../../..';
import { useControlRefs } from '../../hooks';
import { ControlForm } from '../CreateChartForm/components/ControlForm';
import { SelectForm } from '../CreateChartForm/components/SelectForm';
import { CHART_LAYOUT_OPTIONS, CHART_TYPE_OPTIONS, VALIDATION_FORM } from '../CreateChartForm/constants';
import styles from '../CreateChartForm/styles.module.css';
import { CreateChartFormState } from '../CreateChartForm/types';

export interface BaseChartFormProps {
    spreadSheetId: string;
    initialData: CreateChartFormState;
    submitLabel: string;
    onSubmit: (formData: CreateChartFormState) => void;
    onClose?: () => void;
    showResetButton?: boolean;
}

/**
 * Единая реализация формы создания/редактирования графика.
 * CreateChartForm и EditChartForm — тонкие обёртки над ней.
 *
 * Заменяет pluginSubscriptions на usePluginState (читает PluginCursorCellState напрямую).
 */
export const BaseChartForm: FC<BaseChartFormProps> = ({
    spreadSheetId,
    initialData,
    submitLabel,
    onSubmit,
    onClose,
    showResetButton = true,
}) => {
    const [selectedGroupRanges, setSelectedGroupRanges] = useState<null | number>(null);
    const [selectedGroups, setSelectedGroups] = useState<null | number>(null);
    const [activeElementName, setActiveElementName] = useState<string | null>(null);

    const {
        control,
        formState: { isDirty, isValid },
        reset,
        handleSubmit: handleValidation,
        watch,
        setValue,
    } = useForm<CreateChartFormState>({
        defaultValues: initialData,
        resolver: joiResolver(VALIDATION_FORM),
        mode: 'all',
    });

    const objectRefs = useControlRefs();

    // ─── Подписка на выделение и курсор через PluginCursorCellState ───

    const cursorState = usePluginState(PLUGIN_CURSOR_CELL_KEY) ?? { ranges: [], activeRangeIndex: 0 };
    const { ranges = [] } = cursorState;

    // cursor вычисляется из активного Range
    const activeRange = ranges.length ? ranges[cursorState.activeRangeIndex] ?? ranges[ranges.length - 1] : null;
    const cursor = activeRange?.cursor ?? null;

    // ─── Маппинг поле -> ref ───────────────────────────────────────────────────

    const getRefForField = (fieldName: string): RefObject<HTMLInputElement> | null => {
        switch (fieldName) {
            case 'meta.titleRange.cells':
                return objectRefs.lineTitleCells;
            case 'meta.categoryRange.cells':
                return objectRefs.lineCategoryCells;
            case 'meta.itemsRange.cells':
                return objectRefs.lineItemsCells;
            case `meta.groupRanges.${selectedGroupRanges}.titleGroup`:
                return objectRefs.pieNameGroupCell;
            case `meta.groupRanges.${selectedGroupRanges}.titleRange.cells`:
                return objectRefs.pieNameCells;
            case `meta.groupRanges.${selectedGroupRanges}.valueRange.cells`:
                return objectRefs.pieItemsCells;
            case `meta.groups.${selectedGroups}.title`:
                return objectRefs.scatterNameGroupCell;
            case `meta.groups.${selectedGroups}.xAxisRange.cells`:
                return objectRefs.scatterXCells;
            case `meta.groups.${selectedGroups}.yAxisRange.cells`:
                return objectRefs.scatterYCells;
            case `meta.groups.${selectedGroups}.zAxisRange.cells`:
                return objectRefs.scatterZCells;
            default:
                return null;
        }
    };

    /**
     * Когда пользователь выделяет диапазон в таблице,
     * автоматически заполняем сфокусированное поле ввода.
     */
    useEffect(() => {
        if (!activeElementName || !ranges.length) return;

        const range = ranges[0];
        const start = `${range.topLeft.coordinates.rowIndex}:${range.topLeft.coordinates.columnIndex}`;
        const end = `${range.bottomRight.coordinates.rowIndex}:${range.bottomRight.coordinates.columnIndex}`;

        setValue(activeElementName as any, `${start}:${end}`);
        getRefForField(activeElementName)?.current?.blur();
        setActiveElementName(null);
    }, [ranges]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Когда пользователь кликает на ячейку (cursor change),
     * заполняем поля, которые принимают координаты одной ячейки.
     */
    useEffect(() => {
        if (!activeElementName || cursor === null) return;

        // Одиночная ячейка — только для titleGroup и title scatter
        const singleCellFields = [`meta.groupRanges.${selectedGroupRanges}.titleGroup`, `meta.groups.${selectedGroups}.title`];

        if (singleCellFields.includes(activeElementName)) {
            const { rowIndex, columnIndex } = cursor.coordinates;
            setValue(activeElementName as any, `${rowIndex}:${columnIndex}`);
        }
    }, [cursor]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Обработчики focus/blur ───────────────────────────────────────────────

    const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
        setActiveElementName(event.target.name);
    }, []);

    /**
     * При блюре проверяем — если фокус ушёл внутрь таблицы,
     * возвращаем фокус в текущий input (пользователь выбирает диапазон).
     */
    const handleBlur = useCallback(
        (event: FocusEvent<HTMLInputElement>) => {
            const spreadSheet = document.getElementById(spreadSheetId);
            const focusMovedToSpreadsheet =
                spreadSheet && (spreadSheet === event.relatedTarget || spreadSheet.contains(event.relatedTarget as Node));

            if (focusMovedToSpreadsheet) {
                getRefForField(activeElementName ?? '')?.current?.focus();
            } else {
                setActiveElementName(event.target.name);
            }
        },
        [activeElementName, spreadSheetId], // eslint-disable-line react-hooks/exhaustive-deps
    );

    // ─── Сброс при смене типа ─────────────────────────────────────────────────

    const {
        fields: groups,
        append: appendGroups,
        remove: removeGroups,
    } = useFieldArray({ control, name: 'meta.groups' as any });

    const {
        fields: groupRanges,
        append: appendGroupRanges,
        remove: removeGroupRanges,
    } = useFieldArray({ control, name: 'meta.groupRanges' as any });

    const type = watch('type');

    useEffect(() => {
        reset({ type } as any);
        setSelectedGroupRanges(null);
        setSelectedGroups(null);
        removeGroupRanges();
        removeGroups();
    }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleReset = () => {
        reset(initialData);
        removeGroupRanges();
        removeGroups();
        setSelectedGroupRanges(null);
        setSelectedGroups(null);
    };

    const handleSubmit = (form: CreateChartFormState) => onSubmit(form);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={styles.container}>
            <SelectForm name="type" control={control} options={CHART_TYPE_OPTIONS} />
            <div className={styles.content}>
                <ControlForm placeholder="Ширина графика" name="meta.width" control={control} />
                <ControlForm placeholder="Высота графика" name="meta.height" control={control} />

                {/* ── Line / Area / Bar ───────────────────────────────────── */}
                {(type === CHART_TYPE.AREA || type === CHART_TYPE.BAR || type === CHART_TYPE.LINE) && (
                    <>
                        <div className={styles.rangeGroup}>
                            <h5>Диапазон названий</h5>
                            <ControlForm
                                className={styles.pointer}
                                readOnly
                                inputRef={objectRefs.lineTitleCells}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder="Выберите диапазон"
                                name="meta.titleRange.cells"
                                control={control}
                            />
                            <SelectForm name="meta.titleRange.orientation" control={control} options={CHART_LAYOUT_OPTIONS} />
                        </div>
                        <div className={styles.rangeGroup}>
                            <h5>Диапазон категорий</h5>
                            <ControlForm
                                className={styles.pointer}
                                readOnly
                                inputRef={objectRefs.lineCategoryCells}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder="Выберите диапазон"
                                name="meta.categoryRange.cells"
                                control={control}
                            />
                            <SelectForm
                                name="meta.categoryRange.orientation"
                                control={control}
                                options={CHART_LAYOUT_OPTIONS}
                            />
                        </div>
                        <div className={styles.rangeGroup}>
                            <h5>Диапазон значений</h5>
                            <ControlForm
                                className={styles.pointer}
                                readOnly
                                inputRef={objectRefs.lineItemsCells}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder="Выберите диапазон"
                                name="meta.itemsRange.cells"
                                control={control}
                            />
                            <SelectForm name="meta.itemsRange.orientation" control={control} options={CHART_LAYOUT_OPTIONS} />
                        </div>
                    </>
                )}

                {/* ── Pie ─────────────────────────────────────────────────── */}
                {type === CHART_TYPE.PIE && (
                    <div className={styles.groupContainer}>
                        <div className={styles.groupTabs}>
                            {groupRanges.map((_, index) => (
                                <Button
                                    key={index}
                                    color="secondary"
                                    variant={index === selectedGroupRanges ? 'contained' : 'outlined'}
                                    onClick={() => setSelectedGroupRanges(index)}
                                >
                                    {index + 1}
                                </Button>
                            ))}
                            <Button color="secondary" variant="outlined" onClick={() => appendGroupRanges({})}>
                                + Добавить группу
                            </Button>
                        </div>

                        {selectedGroupRanges !== null && (
                            <>
                                <div className={styles.rangeGroup}>
                                    <h5>Название группы</h5>
                                    <ControlForm
                                        className={styles.pointer}
                                        readOnly
                                        inputRef={objectRefs.pieNameGroupCell}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        placeholder="Индекс ячейки"
                                        name={`meta.groupRanges.${selectedGroupRanges}.titleGroup`}
                                        control={control}
                                    />
                                </div>
                                <div className={styles.rangeGroup}>
                                    <h5>Диапазон названий</h5>
                                    <ControlForm
                                        className={styles.pointer}
                                        readOnly
                                        inputRef={objectRefs.pieNameCells}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        placeholder="Выберите диапазон"
                                        name={`meta.groupRanges.${selectedGroupRanges}.titleRange.cells`}
                                        control={control}
                                    />
                                    <SelectForm
                                        name={`meta.groupRanges.${selectedGroupRanges}.titleRange.orientation`}
                                        control={control}
                                        options={CHART_LAYOUT_OPTIONS}
                                    />
                                </div>
                                <div className={styles.rangeGroup}>
                                    <h5>Диапазон значений</h5>
                                    <ControlForm
                                        className={styles.pointer}
                                        readOnly
                                        inputRef={objectRefs.pieItemsCells}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        placeholder="Выберите диапазон"
                                        name={`meta.groupRanges.${selectedGroupRanges}.valueRange.cells`}
                                        control={control}
                                    />
                                    <SelectForm
                                        name={`meta.groupRanges.${selectedGroupRanges}.valueRange.orientation`}
                                        control={control}
                                        options={CHART_LAYOUT_OPTIONS}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Scatter ─────────────────────────────────────────────── */}
                {type === CHART_TYPE.SCATTER && (
                    <div className={styles.groupContainer}>
                        <div className={styles.groupTabs}>
                            {groups.map((_, index) => (
                                <Button
                                    key={index}
                                    color="secondary"
                                    variant={index === selectedGroups ? 'contained' : 'outlined'}
                                    onClick={() => setSelectedGroups(index)}
                                >
                                    {index + 1}
                                </Button>
                            ))}
                            <Button color="secondary" variant="outlined" onClick={() => appendGroups({})}>
                                + Добавить группу
                            </Button>
                        </div>

                        {selectedGroups !== null && (
                            <>
                                <div className={styles.rangeGroup}>
                                    <h5>Название группы</h5>
                                    <ControlForm
                                        className={styles.pointer}
                                        readOnly
                                        inputRef={objectRefs.scatterNameGroupCell}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        placeholder="Индекс ячейки"
                                        name={`meta.groups.${selectedGroups}.title`}
                                        control={control}
                                    />
                                </div>
                                {(['xAxisRange', 'yAxisRange', 'zAxisRange'] as const).map((axis, i) => {
                                    const labels = ['X', 'Y', 'Z'];
                                    const refs = [
                                        objectRefs.scatterXCells,
                                        objectRefs.scatterYCells,
                                        objectRefs.scatterZCells,
                                    ];
                                    return (
                                        <div className={styles.rangeGroup} key={axis}>
                                            <h5>Диапазон {labels[i]} координат</h5>
                                            <ControlForm
                                                className={styles.pointer}
                                                readOnly
                                                inputRef={refs[i]}
                                                onFocus={handleFocus}
                                                onBlur={handleBlur}
                                                placeholder="Выберите диапазон"
                                                name={`meta.groups.${selectedGroups}.${axis}.cells`}
                                                control={control}
                                            />
                                            <SelectForm
                                                name={`meta.groups.${selectedGroups}.${axis}.orientation`}
                                                control={control}
                                                options={CHART_LAYOUT_OPTIONS}
                                            />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Кнопки действий ─────────────────────────────────────────── */}
            <div className={styles.actions}>
                {onClose && (
                    <Button size="small" color="secondary" variant="outlined" className={styles.action} onClick={onClose}>
                        Назад
                    </Button>
                )}
                {showResetButton && (
                    <Button
                        size="small"
                        color="secondary"
                        variant="outlined"
                        className={styles.action}
                        disabled={!isDirty}
                        onClick={handleReset}
                    >
                        Сбросить
                    </Button>
                )}
                <Button size="small" className={styles.action} disabled={!isValid} onClick={handleValidation(handleSubmit)}>
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
};
