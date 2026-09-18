/** Карта объектов UUID -> { name: string } */
export interface UUIDObjectMap {
    [uuid: string]: { name: string };
}

/** Ответ API матрицы */
export interface ApiResponse {
    AllUsersObject?: UUIDObjectMap;
    AllRolesObject?: UUIDObjectMap;
    AllGroupsObject?: UUIDObjectMap;
    AllRulesObject?: UUIDObjectMap;
    AllMatrix: string[];
}

/** Пропсы компонента MTable */
export interface MTableProps {
    key?: string;
    entity: string;
    name: string;
    columnsKey: keyof ApiResponse;
    rowsKey: keyof ApiResponse;
    resourceName: string;
    idField: string;
    togglePath: string;
}

/** Состояние компонента MTable */
export interface MTableState {
    data: ApiResponse | null;
    loading: boolean;
    error: string | null;
}

/** Состояние drag-to-scroll */
export interface DragState {
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    moved: boolean;
}
