import { ReactElement } from 'react';
import style from '../matrix.module.css';
import { Tooltip } from 'ui-kit';

interface MTableHeadColumn {
    uuid: string;
    name: string;
}

interface MTableHeadProps {
    columns: MTableHeadColumn[];
}

export function MTableHead({ columns }: MTableHeadProps): ReactElement {
    return (
        <>
            <th className={style.matrixCorner} aria-hidden />
            {columns.map(({ uuid, name }) => (
                <th key={uuid} className={style.matrixColumnHeader}>
                    <div className={style.matrixHeaderContent}>
                        <Tooltip
                            content={name}
                            allowedPlacements={['top', 'bottom']}
                            containerClassName={style.matrixHeaderText}
                        >
                            <span>{name}</span>
                        </Tooltip>
                    </div>
                </th>
            ))}
        </>
    );
}
