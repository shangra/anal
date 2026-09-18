import React from 'react';
import { Typography, DropDownIcon, List } from 'ui-kit';
import styles from '../AccessMatrix.module.css';

interface PermissionBlockProps {
    title: string;
    icon?: React.ReactNode;
    items: any[];
    collapsed: boolean;
    onToggle: (count: number) => void;
    listOptions: { label: string; hint?: string }[];
}

export const PermissionBlock: React.FC<PermissionBlockProps> = ({ title, icon, items, collapsed, onToggle, listOptions }) => (
    <div className={styles.permissionBlock}>
        <div className={styles.permissionBlockHeader} onClick={() => onToggle(items.length)}>
            {icon}
            <Typography variant="heading6">
                {title} ({items.length})
            </Typography>
            {items.length > 0 && (
                <DropDownIcon size="small" color="text" className={collapsed ? styles.iconRotated : undefined} />
            )}
        </div>
        {!collapsed && <List type="unselectable" options={listOptions} />}
    </div>
);
