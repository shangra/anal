import React from 'react';

import { OPERATION_ORDER } from './constants';
import { EOperation, ICardInfo } from './types';

export interface IAccessContext {
    /** Сущность для которой применяются доступы */
    tableName: 'PivotSchemas' | string | null;
    tableId: string | null;
    tableIdOwner: ICardInfo | null;
    owner: 'roles' | 'rules' | 'users' | 'groups';
    disabled: boolean;
    server: string;
    /** Множество доступных к выбору операций */
    options: Set<EOperation>;
}

const AccessContext = React.createContext<IAccessContext>({
    tableName: null,
    tableId: null,
    tableIdOwner: null,
    owner: 'users',
    disabled: false,
    server: '',
    options: new Set(OPERATION_ORDER),
});

export default AccessContext;
