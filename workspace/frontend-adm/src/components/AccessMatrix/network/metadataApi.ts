import type { AxiosResponse } from 'axios';
import $api from 'helpers/axios';
import { Role, User, Group, Rule } from 'components/AccessMatrix/network/types';

/**
 * Форматирование имени пользователя из атрибутов
 */
export const formatUserName = (user: User): string => {
    const attributes = user.attributes || [];

    // Ищем атрибуты по кодам из примера
    const familyAttr = attributes.find((attr) => attr.code === 543); // Фамилия
    const nameAttr = attributes.find((attr) => attr.code === 542); // Имя
    const patronymicAttr = attributes.find((attr) => attr.code === 544); // Отчество

    const family = familyAttr?.value || '';
    const name = nameAttr?.value || '';
    const patronymic = patronymicAttr?.value || '';

    // Если хотя бы один атрибут найден, формируем ФИО
    if (family || name || patronymic) {
        return `${family} ${name} ${patronymic}`.trim();
    }

    // Иначе используем name из пользователя
    return user.name || user.login;
};

/**
 * Получение всех ролей
 * @param filter - фильтр (опционально)
 * @param server - сервер (префикс URL)
 */
export const getAllRoles = (filter: string | undefined): Promise<AxiosResponse<Role[]>> => {
    const url = filter ? `/usersui/roles/?filter=${filter}` : '/usersui/roles';
    return $api.get(url);
};

/**
 * Получение всех пользователей
 * @param filter - фильтр (опционально)
 * @param server - сервер (префикс URL)
 */
export const getAllUsers = (
    filter: string | undefined,
): Promise<AxiosResponse<{ items: User[]; total: number; filter?: string }>> => {
    const url = filter ? `/usersui/users/?filter=${filter}` : '/usersui/users';
    return $api.get(url);
};

/**
 * Получение всех групп
 * @param filter - фильтр (опционально)
 * @param server - сервер (префикс URL)
 */
export const getAllGroups = (filter: string | undefined): Promise<AxiosResponse<Group[]>> => {
    const url = filter ? `/usersui/groups/?filter=${filter}` : '/usersui/groups';
    return $api.get(url);
};

/**
 * Получение всех правил
 * @param filter - фильтр (опционально)
 * @param server - сервер (префикс URL)
 */
export const getAllRules = (filter: string | undefined): Promise<AxiosResponse<Rule[]>> => {
    const url = filter ? `/usersui/rules/?filter=${filter}` : '/usersui/rules';
    return $api.get(url);
};
