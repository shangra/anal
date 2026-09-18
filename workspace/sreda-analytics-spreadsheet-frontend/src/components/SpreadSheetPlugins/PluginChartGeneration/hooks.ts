import { createRef, useMemo } from 'react';

// ─── Рефы для полей ввода диапазонов ─────────────────────────────────────────

export const useControlRefs = () =>
    useMemo(
        () => ({
            lineTitleCells: createRef<HTMLInputElement>(),
            lineCategoryCells: createRef<HTMLInputElement>(),
            lineItemsCells: createRef<HTMLInputElement>(),

            pieNameGroupCell: createRef<HTMLInputElement>(),
            pieNameCells: createRef<HTMLInputElement>(),
            pieItemsCells: createRef<HTMLInputElement>(),

            scatterNameGroupCell: createRef<HTMLInputElement>(),
            scatterXCells: createRef<HTMLInputElement>(),
            scatterYCells: createRef<HTMLInputElement>(),
            scatterZCells: createRef<HTMLInputElement>(),
        }),
        [],
    );
