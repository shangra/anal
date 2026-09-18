import { v4 as uuidv4 } from 'uuid';

import ErrorAuth from './components/Errors/ErrorAuth';
import ErrorAuthSber from './components/Errors/ErrorAuthSber';

export const POSITIONED_OFF_CANVAS_STATE = 'positionedOffCanvas';

export const METADATA_IN_CURRENT_WINDOW_IN_TABS_STATE = 'MetadataShowInCurrentWindowInTabs';

export const SELECTED_TABLE_ROW_STATE = 'selectedTableRow';
export const NEED_TABLE_FORCE_UPDATE_STATE = 'needTableForceUpdate';
export const NEED_TABULAR_PART_FORCE_SAVE_STATE = 'needTableForceSave';

export const RECENT_TABLE_ID_STATE = 'recentTableId';

/* Создан только для отображения способа работы со стейтом */
const tableExampleId = uuidv4();

export const initState = {
    showEdit: false,
    modal: {
        show: false,
        content: null,
        element: {},
        style: {},
        backdropClassName: '',
        modalClassName: '',
    },
    [POSITIONED_OFF_CANVAS_STATE]: {
        content: null,
        show: false,
        position: 'bottom',
        positionOffset: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        },
        className: '',
        style: {},
    },
    flash: {
        content: null,
        show: false,
        style: {},
        className: '',
    },
    user: {},
    usersUpdate: {},
    rolesUpdate: {},
    rulesUpdate: {},
    groupsUpdate: {},
    pageUpdate: {},
    widgetUpdate: {},
    templateUpdate: {},
    fileUpdate: {},
    eventUpdate: {},
    templateParamsUpdate: {},
    mailingUpdate: {},
    subscribesUpdate: {},
    defaultSubscribesUpdate: {},
    documentsUpdate: {},
    page: {
        id: '',
        name: '',
        uri: '',
        parent: '',
        active: '',
        link: '',
        template: '',
        content_type: '',
        description: '',
        markdel: 0,
    },
    Template: {
        id: '',
        name: '',
        description: '',
        parent: '',
        markdel: 0,
        data: '',
    },
    widget: {},
    pageParams: [],
    rlsType: 'read',
    rulesName: [],
    // theme: 'dark'   после добавления инит стейте раскомментировать, сецчас это вызывает дополнительные ререндер
    device: '',
    notices: [],
    logRequests: [],
    currLogRequest: {},
    currLogConsole: [],
    markdelPages: window.localStorage.getItem('markdelPages') ?? '0',
    markdelTemplate: window.localStorage.getItem('markdelTemplate') ?? '0',
    markdelWidgets: window.localStorage.getItem('markdelWidgets') ?? '0',
    markdelFiles: window.localStorage.getItem('markdelFiles') ?? '0',
    [METADATA_IN_CURRENT_WINDOW_IN_TABS_STATE]: { metadata: { id: '' } },
    [`${SELECTED_TABLE_ROW_STATE}__${tableExampleId}`]: {},
    [`${NEED_TABLE_FORCE_UPDATE_STATE}__${tableExampleId}`]: {}, // При назначении нового пустого объекта будет происходить обновление
    [`${NEED_TABULAR_PART_FORCE_SAVE_STATE}__${tableExampleId}`]: {}, // При назначении нового пустого объекта будет происходить сохранение
    [RECENT_TABLE_ID_STATE]: '',
    errorViews: {
        302: <ErrorAuth />,
        401: <ErrorAuth />,
        403: <ErrorAuth />,
        423: <ErrorAuthSber />,
    },
};
