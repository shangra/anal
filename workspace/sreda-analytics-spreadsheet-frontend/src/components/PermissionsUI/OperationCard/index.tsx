import cn from 'classnames';
import React, { useContext } from 'react';
import { Typography } from 'ui-kit';

import { Avatar } from '../../Avatar';
import AccessContext from '../AccessContext';
import { IOperationSelectProps, OperationSelect } from '../OperationSelect';
import { EOperation, ICardInfo } from '../types';
import styles from './styles.module.css';

interface IOperationCardProps extends ICardInfo, IOperationSelectProps {
    disabled: boolean | EOperation[];
}

export const OperationCard: React.FC<IOperationCardProps> = ({
    avatar,
    title,
    subtitle,
    value: operations,
    confirm,
    options,
    disabled,
    onChange,
}: IOperationCardProps) => {
    const { owner } = useContext(AccessContext);

    return (
        <div className={styles.container}>
            <div className={`${styles.card} ${styles.ellipsis}`}>
                {owner === 'users' && (
                    <div className={styles.avatar}>
                        <Avatar width={32} height={32} avatarId={avatar} />
                    </div>
                )}
                <div className={styles.ellipsis}>
                    <Typography className={styles.title} style={{ marginBottom: 'var(--ui-kit-spacing-2)' }}>
                        {title}
                    </Typography>
                    <Typography variant="captiontext" color="secondary" className={cn(styles.subtitle, styles.ellipsis)}>
                        {subtitle}
                    </Typography>
                </div>
            </div>
            {typeof onChange === 'function' && (
                <OperationSelect
                    value={operations}
                    options={options}
                    confirm={confirm}
                    disabled={disabled}
                    onChange={onChange}
                />
            )}
        </div>
    );
};
