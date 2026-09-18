import React, { useCallback } from 'react';
import { IconButton, EditIcon } from 'ui-kit';
import { getNodeByKey } from 'components/MetadataHier/lib/service';
import { openEditObjectForm } from 'components/MetadataHier/actions/edit/api/handleEdit';
import style from '../styles.module.css';
import { IActionProps } from 'components/MetadataHier/actions';

export const EditAction = ({ server, nodes, children }: IActionProps) => {
    const handleEdit = useCallback(() => {
        if (nodes.length === 0) return;
        const node = nodes[0];
        const normalizedNode = getNodeByKey(server, node.id);
        if (normalizedNode?.routes) {
            openEditObjectForm(server, node.id);
        }
    }, [server, nodes]);

    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;

    const node = nodes[0];
    const normalizedNode = getNodeByKey(server, node.id);

    if (!normalizedNode?.routes) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleEdit}>
                {children}
            </div>
        );
    }

    return <IconButton icon={EditIcon} size="small" onClick={handleEdit} color="primary" />;
};
