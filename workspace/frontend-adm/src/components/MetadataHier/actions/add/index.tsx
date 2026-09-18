import { useCallback } from 'react';
import { BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, IconButton, PlusIcon } from 'ui-kit';
import { v4 as uuidv4 } from 'uuid';
import { getNodeByKey, handleNodeAdd } from 'components/MetadataHier/lib/service';
import { createSaveHandler, fetchCreateForm } from 'components/MetadataHier/actions/add/api/api';
import $windows from 'components/WindowsCMP/windows.helper';
import { RenderFormBuilder } from 'components/Inspector/helpers/FormBuilder';
import { toRawNode } from 'components/MetadataHier/lib/normalize';
import style from '../styles.module.css';
import { IActionProps } from 'components/MetadataHier/actions';
import { NormalizedNode } from 'components/MetadataHier/types';

export const isAddActionVisible = (node: NormalizedNode | null | undefined): boolean => {
    if (!node) return false;
    if (!node.routes) return false;
    if (!node.crud?.includes('c')) return false;
    return true;
};

export const handleAddAction = async (normalizedNode: NormalizedNode | undefined, server: string) => {
    if (!normalizedNode?.routes) return;
    if (!normalizedNode) return;
    if (!normalizedNode.crud.includes('c')) return;
    const windowId = uuidv4();
    const windowInitialProps = { uuid: windowId, width: '600px', height: 'fit-content' };

    const windowCallback = async () => {
        // id -> nodeKey. Важно для перезагрузки
        await handleNodeAdd(server, normalizedNode.nodeKey);
        $windows.close(windowId, undefined);
    };

    try {
        const form = await fetchCreateForm(server, normalizedNode.routes);
        const rawNode = toRawNode(normalizedNode);
        const handleSave = createSaveHandler({
            form,
            node: rawNode,
            server,
            onSuccess: windowCallback,
        });

        $windows.open(
            'Добавить объект',
            <div style={{ padding: '10px 15px' }}>
                <RenderFormBuilder
                    server={server}
                    formData={form}
                    node={normalizedNode}
                    type={form.type}
                    onSave={handleSave}
                />
            </div>,
            windowInitialProps,
        );
    } catch (err) {
        console.error(err);
    }
};

export const AddAction = ({ server, nodes, children }: IActionProps) => {
    const handleAdd = useCallback(async () => {
        if (nodes.length === 0) return;
        const node = nodes[0];
        const normalizedNode = getNodeByKey(server, node.id);
        await handleAddAction(normalizedNode, server);
    }, [server, nodes]);

    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;

    const node = nodes[0];
    const normalizedNode = getNodeByKey(server, node.id);

    if (nodes.length > 1) return null;
    if (!isAddActionVisible(normalizedNode)) return null;

    if (children) {
        return (
            <div className={style.buttonContainer} onClick={handleAdd}>
                {children}
            </div>
        );
    }

    return (
        <IconButton
            icon={PlusIcon}
            size={BUTTON_SIZE.MEDIUM}
            variant={BUTTON_VARIANT.OUTLINED}
            onClick={handleAdd}
            color={BUTTON_COLOR.SUCCESS}
            rounded
            title="Добавить элемент"
        />
    );
};
