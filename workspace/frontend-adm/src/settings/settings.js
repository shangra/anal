const DEFAULT_BACKEND_PREFIX = '/api';

export const DOMAIN = process?.env?.REACT_APP_DOMAIN || '';

const CUSTOM_FRONTEND_PREFIX = process?.env?.PUBLIC_URL ?? '';
const CUSTOM_BACKEND_PREFIX = process?.env?.REACT_APP_BACKEND_PREFIX ?? DEFAULT_BACKEND_PREFIX;

// Добавление "/" в случае если его нет
export const FRONTEND_PREFIX_PROCESSED = CUSTOM_FRONTEND_PREFIX
    ? (CUSTOM_FRONTEND_PREFIX[0] !== '/' ? '/' : '') + CUSTOM_FRONTEND_PREFIX
    : '';
export const BACKEND_PREFIX_PROCESSED = CUSTOM_BACKEND_PREFIX
    ? (CUSTOM_BACKEND_PREFIX[0] !== '/' ? '/' : '') + CUSTOM_BACKEND_PREFIX
    : '';

export const BACKEND_PROXY = BACKEND_PREFIX_PROCESSED ? `${DOMAIN}${BACKEND_PREFIX_PROCESSED}` : `${DOMAIN}`;
export const FRONTEND_URL = FRONTEND_PREFIX_PROCESSED ? `${DOMAIN}${FRONTEND_PREFIX_PROCESSED}` : `${DOMAIN}`;

export const userDataKeysDepended = ['SelfBoard', 'theme', 'assistant', 'backgroundImageHash'];

export const MODULE_FEDERATION_HOST_CONTAINER_NAME = 'DR_Portal';

export const ESB_ENABLED = process.env.REACT_APP_ESB_ENABLED === 'true'