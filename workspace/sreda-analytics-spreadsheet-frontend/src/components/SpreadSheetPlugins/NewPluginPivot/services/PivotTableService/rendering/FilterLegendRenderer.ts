import { IButton, ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';
import { FilterIcon } from '../icons';
import { IFilterLegendRenderer, IPivotFilter, IPivotFilterGroup, IViewValueResolver, OnFilterClickCallback } from '../types';

const COMPARATORS: Record<string, string> = {
    $iLike: '',
    $notILike: 'не',
    $eq: '=',
    $ne: '!=',
    $gt: '>',
    $lt: '<',
    $gte: '>=',
    $lte: '<=',
};

const LOGIC_TYPES: Record<string, string> = {
    $or: 'ИЛИ',
    $and: 'И',
};

export default class FilterLegendRenderer implements IFilterLegendRenderer {
    onFilterClickCallback?: OnFilterClickCallback;

    // FIX [M-10]: viewResolver не readonly — может быть обновлён после создания.
    constructor(private viewResolver?: IViewValueResolver) {}

    // FIX [M-10]: Позволяет Orchestrator'у обновить resolver после initialize().
    setViewResolver(resolver: IViewValueResolver): void {
        this.viewResolver = resolver;
    }

    setOnFilterClickCallback(callback: OnFilterClickCallback): void {
        this.onFilterClickCallback = callback;
    }

    private flattenFilters(
        originalFilter: (IPivotFilterGroup | IPivotFilter)[],
    ): Record<string, Record<keyof IPivotFilterGroup, IPivotFilter[]>> {
        const result: Record<string, Record<keyof IPivotFilterGroup, IPivotFilter[]>> = {};

        const addCondition = (field: string, condition: IPivotFilter, logicType: keyof IPivotFilterGroup) => {
            result[field] ??= {} as Record<keyof IPivotFilterGroup, IPivotFilter[]>;
            result[field][logicType] ??= [];
            result[field][logicType]!.push(condition);
        };

        const processFilterNode = (node: IPivotFilterGroup | IPivotFilter, logicType: keyof IPivotFilterGroup = '$and') => {
            for (const [field, condition] of Object.entries(node)) {
                if (['$or', '$and'].includes(field)) {
                    for (const cond of condition as (IPivotFilterGroup | IPivotFilter)[]) {
                        processFilterNode(cond, field as '$and' | '$or');
                    }
                    continue;
                }

                // Пропускаем внутренние поля DrillDown — они не отображаются
                // в легенде фильтров.
                if (field.startsWith('__') && field.endsWith('__')) {
                    continue;
                }

                if (typeof condition !== 'object' || condition === null) {
                    addCondition(field, { $eq: condition }, logicType);
                    continue;
                }

                const cleanCondition = {
                    ...(condition as IPivotFilter),
                };
                // Удаляем служебные поля из отображаемого условия.
                ['__level__', '__type__', '__format__', '__parent__'].forEach((metaField) => delete cleanCondition[metaField]);

                if (Object.keys(cleanCondition).length > 0) {
                    addCondition(field, cleanCondition, logicType);
                }
            }
        };

        for (const filter of originalFilter) {
            processFilterNode(filter);
        }

        return result;
    }

    private collectFormattedValues(field: string, filter: Record<keyof IPivotFilterGroup, IPivotFilter[]>): string[] {
        const formattedValues: string[] = [];
        let logicIndex = 0;

        for (const [logicType, conditions] of Object.entries(filter)) {
            for (const condition of conditions) {
                const cloned = { ...condition };

                // Объединяем $gte/$lte в диапазонное отображение.
                if ('$gte' in cloned && '$lte' in cloned) {
                    cloned.$iLike = `${cloned.$gte} / ${cloned.$lte}`;
                    delete cloned.$gte;
                    delete cloned.$lte;
                }

                for (const [comparator, value] of Object.entries(cloned)) {
                    const userValue = this.viewResolver?.resolveView(field, value) ?? value;

                    const parts = [
                        LOGIC_TYPES[logicType],
                        COMPARATORS[comparator as keyof typeof COMPARATORS],
                        String(userValue ?? value),
                    ];
                    if (logicIndex === 0) parts.shift();

                    formattedValues.push(parts.filter(Boolean).join(' '));
                }

                logicIndex++;
            }
        }

        return formattedValues;
    }

    build(where: IPivotFilterGroup | IPivotFilter = {}): Map<number, Map<number, ICellWithStyles>> {
        // Извлекаем пользовательские фильтры из $and.
        // getWhereParams в SredaPivotDataManager всегда оборачивает в { $and: [...] }.
        const andArray = ((where as IPivotFilterGroup).$and as (IPivotFilterGroup | IPivotFilter)[]) ?? [];

        const flattenFilters = this.flattenFilters(andArray);

        const legend = new Map<number, Map<number, ICellWithStyles>>();
        let rowIdx = 0;

        for (const [field, filter] of Object.entries(flattenFilters)) {
            const components: IButton[] = [];

            if (this.onFilterClickCallback) {
                components.push({
                    positionRelativeToText: 'after',
                    type: 'button',
                    disabled: false,
                    loading: false,
                    icon: FilterIcon,
                    color: 'primary',
                    onClick: () => this.onFilterClickCallback?.(field),
                });
            }

            const fieldCell: ICellWithStyles = {
                components: [],
                data: this.viewResolver?.resolveView(field, field) ?? field,
                styles: { hyphenation: 'crop' },
                config: { readonly: true },
            };

            const formattedValues = this.collectFormattedValues(field, filter);
            const valueLabel = formattedValues.length > 1 ? '(несколько элементов)' : formattedValues[0] ?? '';

            const rowMap = new Map<number, ICellWithStyles>([
                [0, fieldCell],
                [
                    1,
                    {
                        components,
                        data: valueLabel,
                        styles: {
                            hyphenation: 'crop',
                            horizontalAlign: 'end',
                        },
                        config: { readonly: true },
                    },
                ],
            ]);

            legend.set(rowIdx++, rowMap);
        }

        return legend;
    }
}
