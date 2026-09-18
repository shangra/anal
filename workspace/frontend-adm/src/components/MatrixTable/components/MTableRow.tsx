import { memo, ReactElement } from 'react';
import { Checkbox, Tooltip } from 'ui-kit';
import style from '../matrix.module.css';

interface MTableRowColumn {
    uuid: string;
    name: string;
}

interface MTableRowProps {
    rowIdx: number;
    rowUuid: string;
    rowName: string;
    columns: MTableRowColumn[];
    matrixSet: Set<string>;
    onCellClick: (colUuid: string, rowUuid: string, rowIdx: number, colIdx: number, isChecked: boolean) => void;
}

export function MTableRowImpl({ rowIdx, rowUuid, rowName, columns, matrixSet, onCellClick }: MTableRowProps): ReactElement {
    return (
        <>
            <td className={style.matrixRowHeader}>
                <div className={style.matrixHeaderContent}>
                    <Tooltip content={rowName} placement="right" containerClassName={style.matrixHeaderText}>
                        <span>{rowName}</span>
                    </Tooltip>
                </div>
            </td>
            {columns.map(({ uuid, name: colName }, colIdx) => {
                const matrixKey = `${rowIdx}_${colIdx}`;
                const isChecked = matrixSet.has(matrixKey);

                return (
                    <td
                        key={`${rowUuid}-${uuid}`}
                        className={style.matrixCell}
                        aria-label={`Checkbox in column ${colName}, in row ${rowName}`}
                    >
                        <Checkbox checked={isChecked} onChange={() => onCellClick(uuid, rowUuid, rowIdx, colIdx, isChecked)} />
                    </td>
                );
            })}
        </>
    );
}

export const MTableRow = memo(MTableRowImpl, (prev, next) => {
    if (prev.rowIdx !== next.rowIdx || prev.rowUuid !== next.rowUuid || prev.rowName !== next.rowName) {
        return false;
    }
    if (prev.matrixSet !== next.matrixSet) return false;
    if (prev.onCellClick !== next.onCellClick) return false;
    if (prev.columns.length !== next.columns.length) return false;
    return true;
});
