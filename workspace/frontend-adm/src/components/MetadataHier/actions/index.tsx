import { ComponentType, PureComponent, ReactNode } from 'react';
import { SortAction } from 'components/MetadataHier/actions/sort';
import { EditAction } from 'components/MetadataHier/actions/edit';
import { DeleteAction } from 'components/MetadataHier/actions/delete';
import { EditAccessAction } from 'components/MetadataHier/actions/editAccess';
import { AddAction } from 'components/MetadataHier/actions/add';
import { UpdateAction } from 'components/MetadataHier/actions/update';
import { OpenFileManagerAction } from 'components/MetadataHier/actions/openFileManager';
import { TreeDataControlled } from 'ui-kit';

export enum Actions {
    EDIT = 'edit',
    ADD = 'add',
    DELETE = 'delete',
    SORT = 'sort',
    EDIT_ACCESS = 'edit-access',
    UPDATE = 'update',
    OPEN_FILE_MANAGER = 'open-file-manager',
}

export interface IActionProps {
    server: string;
    nodes: TreeDataControlled[];
    children?: ReactNode;
    isInContextMenu?: boolean;
}

const actionComponents: Record<Actions, ComponentType<IActionProps>> = {
    [Actions.EDIT]: EditAction,
    [Actions.ADD]: AddAction,
    [Actions.DELETE]: DeleteAction,
    [Actions.SORT]: SortAction,
    [Actions.EDIT_ACCESS]: EditAccessAction,
    [Actions.UPDATE]: UpdateAction,
    [Actions.OPEN_FILE_MANAGER]: OpenFileManagerAction,
};

function getActionComponent(action: Actions) {
    return actionComponents[action];
}

interface IProps {
    actions: Actions[] | '*';
    nodes: TreeDataControlled[] | null;
    server: string;
}

export class MetadataHierActions extends PureComponent<IProps> {
    render() {
        const { actions, nodes } = this.props;
        // Не блокируем рендер, если ничего не выделено —
        // отдельные action-компоненты (например UpdateAction) решают сами,
        // видны ли они при пустом выделении.
        const resolvedNodes = nodes ?? [];

        if (actions === '*') {
            return (
                <>
                    {Object.values(actionComponents).map((ActionComponent, index) => (
                        <ActionComponent key={index} nodes={resolvedNodes} server={this.props.server} />
                    ))}
                </>
            );
        }

        return (
            <>
                {actions.map((action, index) => {
                    const ActionComponent = getActionComponent(action);
                    if (!ActionComponent) return null;
                    return <ActionComponent server={this.props.server} key={index} nodes={resolvedNodes} />;
                })}
            </>
        );
    }
}
