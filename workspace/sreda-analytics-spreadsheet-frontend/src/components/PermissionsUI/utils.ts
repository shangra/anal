import { useEffect, useState } from 'react';

import { attributesArrayToObject, getFioFullFromUserState, getUserPosition } from '../../helpers/getFioFromAttributes';
import { EOperation, ICardInfo } from './types';

const convertUsers = (list: any[]): ICardInfo[] =>
    list.map((i: any) => {
        const attributes = attributesArrayToObject(i.attributes);
        const fioName = getFioFullFromUserState(attributes);
        const positionName = getUserPosition(attributes)?.value ?? '';

        return {
            id: i.id,
            avatar: i.avatar,
            title: fioName,
            subtitle: positionName,
            value: i.access as EOperation[],
        };
    });

const convertRules = (list: any[]): ICardInfo[] =>
    list.map((i: any) => ({
        id: i.id,
        // avatar: user.avatar,
        title: i.details,
        subtitle: i.name,
        value: i.access as EOperation[],
    }));

export function convert(list: any[], owner: 'users' | 'roles' | 'rules' | 'groups') {
    switch (owner) {
        case 'users':
            return convertUsers(list);
        case 'rules':
            return convertRules(list);
        case 'roles':
        case 'groups':
            // TODO TBD
            return list;
        default:
            throw new Error('Неожиданныый тип получателя доступа');
    }
}

type DiffResult<T> = {
    added: T[];
    removed: T[];
};

export function diff<T>(oldArr: T[], newArr: T[]): DiffResult<T> {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    return {
        added: [...newSet].filter((x) => !oldSet.has(x)),
        removed: [...oldSet].filter((x) => !newSet.has(x)),
    };
}

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
