/**
 * Единый контракт DnD-источника.
 * Все SortableItem в PivotMenu передают эти поля через useSortable.data.
 */

export const PIVOT_SOURCE_BLOCKS = ['fields', 'layers', 'filter', 'columns', 'rows', 'values'] as const;

export type PivotSourceBlock = (typeof PIVOT_SOURCE_BLOCKS)[number];

export type PivotParamType = 'Measure' | 'Dimension' | null;

export interface PivotDragSource {
    sourceBlock: PivotSourceBlock;
    originalId: string;
    /** Объект перетаскиваемого элемента (IField | ILayer) */
    element: any;
    uuid: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Матрица допустимых переходов.
 * Используется как в SortableContainer для подсветки drop-зоны,
 * так и в onDragEnd для принятия решения о действии.
 *
 * @param sourceBlock      Блок-источник
 * @param destinationBlock Блок-цель
 * @param paramType        'Measure' | 'Dimension' | null (у слоёв — null)
 */
export function canDrop(
    sourceBlock: PivotSourceBlock | null | undefined,
    destinationBlock: PivotSourceBlock | null | undefined,
    paramType: PivotParamType,
): boolean {
    if (!sourceBlock || !destinationBlock) return false;

    // Из fields -> только в подходящие items-блоки
    if (['fields', 'values'].includes(sourceBlock)) {
        if (paramType === 'Measure') return destinationBlock === 'values';
        if (paramType === 'Dimension') return ['filter', 'columns', 'rows', 'values'].includes(destinationBlock);
        return false;
    }

    // Слои -> только сортировка внутри себя
    if (sourceBlock === 'layers') return destinationBlock === 'layers';

    // Из items-блоков:
    //   назад в fields/layers -> удаление (разрешено)
    // if (destinationBlock === 'fields' || destinationBlock === 'layers') return true;

    // if (sourceBlock === 'values') {
    //     if (paramType === 'Measure') return ['fields', 'values'].includes(destinationBlock);
    //     if (paramType === 'Dimension') return ['filter', 'columns', 'rows', 'values'].includes(destinationBlock);
    // }

    //   в любой items-блок (включая себя) -> перемещение/сортировка
    return ['filter', 'columns', 'rows', 'values'].includes(destinationBlock);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Извлекает данные DnD-источника из события dnd-kit.
 * Возвращает null, если перетаскивается посторонний элемент
 * (нет sourceBlock или он не из PIVOT_SOURCE_BLOCKS).
 */
export function getDragSource(event: any): PivotDragSource | null {
    const data = event?.active?.data?.current;
    if (!data) return null;

    const { sourceBlock, originalId, element, uuid } = data;

    if (!sourceBlock || !originalId || !(PIVOT_SOURCE_BLOCKS as readonly string[]).includes(sourceBlock)) {
        return null;
    }

    return {
        sourceBlock: sourceBlock as PivotSourceBlock,
        originalId,
        element: element ?? null,
        uuid: uuid ?? null,
    };
}
