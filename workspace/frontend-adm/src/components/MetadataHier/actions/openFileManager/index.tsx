import React, { useCallback } from 'react';
import { IconButton, EditIcon } from 'ui-kit';
import style from '../styles.module.css';
import { IActionProps } from 'components/MetadataHier/actions';
import { openFileManager } from 'components/MetadataHier/events';

const NODE_CLASS = 'files';

/**
 * Action «Открыть файл-менеджер».
 *
 * Отображается только для узлов с `node.class === 'files'`
 * (узел «Файлы» из `metadata-files`).
 * При клике открывает окно `AdminUiKit.FileManagerWindow` аналогично
 * двойному клику по узлу.
 */
export const OpenFileManagerAction = ({ server, nodes, children }: IActionProps) => {
    const handleOpen = useCallback(() => {
        if (nodes.length === 0) return;
        const node = nodes[0];
        openFileManager(
            {
                id: node.id,
                title: 'Файлы',
                rootId: '00000000-0000-0000-0000-000000000000',
                server,
            },
            { server, nodeKey: node.id },
        );
    }, [server, nodes]);

    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;

    const node = nodes[0];
    if ((node as unknown as Record<string, unknown>).class !== NODE_CLASS) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleOpen}>
                {children}
            </div>
        );
    }

    return <IconButton icon={EditIcon} size="small" onClick={handleOpen} color="primary" />;
};
