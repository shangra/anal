import React, { useCallback } from 'react';
import { AccessLockIcon, BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, IconButton } from 'ui-kit';
import { getNodeByKey } from 'components/MetadataHier/lib/service';
import { hasRule } from 'helpers/access';
import style from '../styles.module.css';
import StateManager from 'lite-react-statemanager';
import { IActionProps } from 'components/MetadataHier/actions';
import { NormalizedNode } from 'components/MetadataHier/types';

/** RLS включён: явное поле с бэка или маркер в crud (как у корня «Метаданные»). */
export const nodeHasRls = (node: NormalizedNode | null | undefined): boolean =>
    Boolean(node) && (node!.rls === true || node!.crud?.includes('rls') === true);

export const isEditAccessActionVisible = (node: NormalizedNode | null | undefined): boolean => nodeHasRls(node);

// Область видимости прав на объекты дерева метаданных. Значение должно совпадать с фактическим
// именем таблицы, которое подставляет rls-ext-metadata.setMapping (ключ маппинга 'metadata' —
// строчными, значение 'Metadata'). На сервере имя нормализуется через mapTableName (I2).
const METADATA_TABLE_NAME = 'Metadata';

export const EditAccessAction = ({ server, nodes, children }: IActionProps) => {
    const node = nodes[0];
    const nodeFromStore = getNodeByKey(server, node?.id);

    const handleEditAccess = useCallback(() => {
        if (nodes.length === 0) return;
        const node = nodes[0];
        const nodeFromStore = getNodeByKey(server, node.id);
        StateManager.setState({
            nodeAccess: { nodeId: nodeFromStore?.id, tableName: METADATA_TABLE_NAME, server },
        });
    }, [server, nodes, nodeFromStore]);

    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;
    if (!isEditAccessActionVisible(nodeFromStore)) return null;

    // Кнопка доступна только для объектов метаданных со включённым RLS.
    if (!nodeHasRls(nodeFromStore)) return null;
    // Управление доступом требует права MetadataAccessWrite.
    if (!hasRule('MetadataAccessWrite')) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleEditAccess}>
                {children}
            </div>
        );
    }

    return (
        <IconButton
            icon={AccessLockIcon}
            variant={BUTTON_VARIANT.OUTLINED}
            size={BUTTON_SIZE.MEDIUM}
            color={BUTTON_COLOR.SECONDARY}
            onClick={handleEditAccess}
            title="Редактировать доступ"
            rounded
        />
    );
};
