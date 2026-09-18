import type { AxiosResponse } from 'axios';
import $api from 'helpers/axios';
import { AccessData, AccessGroup, AccessType, Role, Rule, User, Group } from 'components/AccessMatrix/network/types';

const buildUrl = (server: string, path: string): string => `${server && server !== '__default__' ? `/${server}` : ''}${path}`;

/**
 * Формирует URL с учётом tableName и параметра separate.
 */
const buildAccessUrl = (tableName: string, path: string, separate: boolean): string => {
    const url = path.replace('Metadata', tableName);
    if (separate) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}separate=yes`;
    }
    return url;
};

/**
 * Получение данных доступа для конкретного элемента метаданных
 * @param id - ID элемента метаданных
 * @param group - группа доступа (permissions, users, roles, rules, groups)
 * @param type - тип прав (view, read, write, delete)
 * @param server - сервер (префикс URL)
 * @param tableName - имя таблицы (по умолчанию Metadata)
 */
export const getMetadataAccess = (
    id: string,
    group: AccessGroup,
    type: AccessType,
    server: string,
    tableName = 'Metadata',
    separate = false,
): Promise<AxiosResponse<AccessData>> => {
    const url = buildAccessUrl(tableName, `/rls/Metadata/${id}/${group}/?type=${type}`, separate);
    return $api.get(buildUrl(server, url));
};

/**
 * Получение ролей с доступом к элементу
 * @param id - ID элемента метаданных
 * @param type - тип прав (view, read, write, delete)
 * @param server - сервер (префикс URL)
 * @param tableName - имя таблицы (по умолчанию Metadata)
 */
export const getRolesWithAccess = (
    id: string,
    type: AccessType,
    server: string,
    tableName = 'Metadata',
    separate = false,
): Promise<AxiosResponse<Role[]>> => {
    const url = buildAccessUrl(tableName, `/rls/meta/Metadata/${id}/roles/?type=${type}`, separate);
    return $api.get(buildUrl(server, url));
};

/**
 * Получение правил с доступом к элементу
 * @param id - ID элемента метаданных
 * @param type - тип прав (view, read, write, delete)
 * @param server - сервер (префикс URL)
 * @param tableName - имя таблицы (по умолчанию Metadata)
 */
export const getRulesWithAccess = (
    id: string,
    type: AccessType,
    server: string,
    tableName = 'Metadata',
    separate = false,
): Promise<AxiosResponse<Rule[]>> => {
    const url = buildAccessUrl(tableName, `/rls/meta/Metadata/${id}/rules/?type=${type}`, separate);
    return $api.get(buildUrl(server, url));
};

/**
 * Получение пользователей с доступом к элементу
 * @param id - ID элемента метаданных
 * @param type - тип прав (view, read, write, delete)
 * @param server - сервер (префикс URL)
 * @param tableName - имя таблицы (по умолчанию Metadata)
 */
export const getUsersWithAccess = (
    id: string,
    type: AccessType,
    server: string,
    tableName = 'Metadata',
    separate = false,
): Promise<AxiosResponse<User[]>> => {
    const url = buildAccessUrl(tableName, `/rls/meta/Metadata/${id}/users/?type=${type}`, separate);
    return $api.get(buildUrl(server, url));
};

/**
 * Получение групп с доступом к элементу
 * @param id - ID элемента метаданных
 * @param type - тип прав (view, read, write, delete)
 * @param server - сервер (префикс URL)
 * @param tableName - имя таблицы (по умолчанию Metadata)
 */
export const getGroupsWithAccess = (
    id: string,
    type: AccessType,
    server: string,
    tableName = 'Metadata',
    separate = false,
): Promise<AxiosResponse<Group[]>> => {
    const url = buildAccessUrl(tableName, `/rls/meta/Metadata/${id}/groups/?type=${type}`, separate);
    return $api.get(buildUrl(server, url));
};
