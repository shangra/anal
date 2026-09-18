import React, { useContext, useEffect, useRef, useState } from 'react';
import { ClearIcon, Input, Loader, SearchIcon, Typography } from 'ui-kit';

import AccessContext from '../AccessContext';
import { OperationLabels } from '../constants';
import { OperationCard } from '../OperationCard';
import { EOperation, ICardInfo } from '../types';
import { useDebounce } from '../utils';
import styles from './styles.module.css';

/**
 * Вычисляет итоговый `disabled` для карточки с учётом глобальной блокировки.
 * - Если глобальная блокировка активна (`true`) — возвращает `true`.
 * - Иначе возвращает значение item.disabled (может быть массивом операций).
 */
function resolveDisabled(
    globalDisabled: boolean,
    propsDisabled: boolean | undefined,
    itemDisabled: boolean | EOperation[] | undefined,
): boolean | EOperation[] {
    if (globalDisabled || propsDisabled) return true;
    return itemDisabled ?? false;
}

interface IProps {
    items: ICardInfo[];
    disabled?: boolean;
    onChange: (id: string, value: EOperation[]) => void;
    onSearch?: (search: string) => void;
    isLoading: number;
}

export const ItemsList: React.FC<IProps> = ({ items, isLoading, disabled: propsDisabled, onChange, onSearch }: IProps) => {
    const { tableIdOwner, owner, options, disabled } = useContext(AccessContext);

    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        if (typeof onSearch === 'function') {
            onSearch(debouncedSearch);
        }
    }, [debouncedSearch, onSearch]);

    if (typeof onSearch !== 'function') {
        items = (items ?? []).filter((u) => {
            const regexp = new RegExp(debouncedSearch, 'i');
            return u.title.match(regexp) || u.subtitle?.match(regexp);
        });
    }

    return (
        <>
            <Input
                name="search"
                variant="contained"
                placeholder="Поиск"
                value={search}
                onChange={(e) => setSearch(e.target.value.trimStart().replace(/\s{2,}/, ' '))}
                leftIcon={SearchIcon}
                rightIcon={ClearIcon}
                // hint={owner === 'users' ? 'ФИО, Email omega/sigma, таб.№, логин' : undefined}
                onClickRightIcon={() => setSearch('')}
                fullWidth
                style={{ marginBottom: 'var(--ui-kit-spacing-6)' }}
            />
            {owner === 'users' && tableIdOwner && (
                <OperationCard key={tableIdOwner.id} {...tableIdOwner} options={options} disabled />
            )}
            <div className={styles.divider_container}>
                <div className={styles.divider} />
                <div className={styles.divider_text}>
                    {[...options].map((o) => (
                        <Typography key={o} variant="captiontext" color="secondary">
                            {OperationLabels[o].toLocaleLowerCase()}
                        </Typography>
                    ))}
                </div>
            </div>
            <div className={styles.scrollbars} style={{ maxHeight: 450, height: 220 }}>
                <div className={styles['scrollbars-content-wrapper']} style={{ overflowX: 'hidden' }}>
                    <div className={styles['scrollbars-content']} style={{ width: '100%' }}>
                        {isLoading ? (
                            <div className={styles.loader_container}>
                                <Loader size="small" />
                            </div>
                        ) : (
                            items.map((item) => (
                                <OperationCard
                                    key={item.id}
                                    {...item}
                                    options={options}
                                    disabled={resolveDisabled(disabled, propsDisabled, item.disabled)}
                                    onChange={(value) => onChange?.(item.id, value)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
            <div className={styles.divider_container}>
                <div className={styles.divider} />
            </div>
        </>
    );
};
