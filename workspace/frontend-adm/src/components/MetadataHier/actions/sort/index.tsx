import React, { useCallback, useMemo } from 'react';
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, IconButton, SortArrowsIcon } from 'ui-kit';
import { getNodeByKey, handleNodeUpdate } from 'components/MetadataHier/lib/service';
import style from '../styles.module.css';
import { IActionProps } from 'components/MetadataHier/actions';
import StateManager from 'lite-react-statemanager';
import { RankEditor } from 'components/RankEditor';
import { NormalizedNode } from 'components/MetadataHier/types';

export const isSortActionVisible = (node?: NormalizedNode): boolean => {
    if (!node?.childrenIds || node.childrenIds.length === 0) return false;
    return true;
};

export const SortAction = ({ server, nodes, children }: IActionProps) => {
    const node = nodes?.[0];

    const fromStore = useMemo<NormalizedNode | undefined>(() => {
        if (!node) return undefined;
        return getNodeByKey(server, node.id);
    }, [server, node?.id]);

    const handleOpenRankModal = useCallback(() => {
        if (nodes.length === 0) return;
        const sort = fromStore?.sort;
        const mode: 'db' | 'local' = sort?.strategy === 'db' ? 'db' : 'local';
        const dbSort = sort?.strategy === 'db' ? sort : null;
        const nodeKey = fromStore?.nodeKey ?? node!.id;

        const modalCallback = async () => {
            if (mode === 'db') {
                await handleNodeUpdate(server, nodeKey);
                StateManager.setState({
                    flash: { show: true, content: 'Новый порядок сохранен!' },
                    modal: { show: false },
                    pageUpdate: {},
                });
            } else {
                StateManager.setState({
                    flash: {
                        show: true,
                        content:
                            'Эти поля не хранятся в базе данных — порядок изменён только ' +
                            'в интерфейсе и не будет сохранён после перезагрузки страницы.',
                    },
                    modal: { show: false },
                });
            }
        };

        StateManager.setState({
            modal: {
                show: true,
                element: {
                    name: 'Сортировка',
                },
                size: 'lg',
                content: (
                    <RankEditor
                        server={server}
                        mode={mode}
                        classId={mode === 'db' ? dbSort!.classId : fromStore?.classId ?? ''}
                        parentId={mode === 'db' ? dbSort!.parent : fromStore?.id ?? node!.id}
                        nodeKey={nodeKey}
                        callback={modalCallback}
                    />
                ),
            },
        });
    }, [server, fromStore, node]);

    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;
    if (!isSortActionVisible(fromStore)) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleOpenRankModal}>
                {children}
            </div>
        );
    }

    return (
        <IconButton
            icon={SortArrowsIcon}
            variant={BUTTON_VARIANT.OUTLINED}
            size={BUTTON_SIZE.MEDIUM}
            color={BUTTON_COLOR.SECONDARY}
            onClick={handleOpenRankModal}
            rounded
            title="Сортировать элементы"
        />
    );
};
