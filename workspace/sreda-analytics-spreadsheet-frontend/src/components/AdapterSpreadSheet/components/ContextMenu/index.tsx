import React from 'react';

import { ListItem } from '../../../UIKit/ListItem';
import { Popover } from '../../../UIKit/Popover';
import { IContextMenu } from '../../types';
import styles from './styles.module.css';

interface IContextMenuProps extends IContextMenu {
    onClose: () => void;
}

export const ContextMenu: React.FC<IContextMenuProps> = (props: IContextMenuProps) => (
    <Popover
        testId="context-menu-popover"
        opened={props.visible}
        onOpened={(value) => {
            if (!value) props.onClose();
        }}
        content={props.items.map((item, index) => (
            <React.Fragment key={index}>
                {item.divider ? (
                    <div className={styles.divider} role="separator" />
                ) : (
                    <ListItem
                        testId={`context-menu-popover-list-item-${index}`}
                        icon={item.icon}
                        label={item.label}
                        onClick={() => {
                            item.action();
                            props.onClose();
                        }}
                        disabled={item.disabled}
                        style={{
                            minHeight: 32,
                            maxHeight: 32,
                            borderRadius: 6,
                        }}
                    />
                )}
            </React.Fragment>
        ))}
        placement="right-start"
        closeOnContentClick={false}
        closeOnOutsideClick
        autoPlacement
        allowedPlacements={['top', 'bottom', 'left', 'right', 'top-start', 'bottom-start', 'left-start', 'right-start']}
        offset={8}
        autoWidth
        style={{ width: 300 }}
        showArrow={false}
        containerClassName={styles.trigger}
        containerStyle={{ left: props.x, top: props.y }}
    />
);
