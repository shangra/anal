import { PureComponent, ReactNode } from 'react';
import StateManager from 'lite-react-statemanager';
import { FlatTreeNode, IconButton, HelpIcon, Tooltip, TreeDataControlled } from 'ui-kit';
import {
    applyChangeNode,
    clearSelectedIds,
    getSelectedFlatNodes,
    handleNodeClick,
    loadChildren,
    loadRoot,
    setMultiSelectMode,
    toggleExpanded,
} from './lib/service';
import {
    changeNodeKey,
    clearScope,
    EMPTY_SCOPE,
    readMetadataSelected,
    readScope,
    scopeKey,
    ScopeState,
    writeMetadataSelected,
} from './lib/scope';
import { saveTreePartial } from 'components/MetadataHier/lib/cache';
import { TreeDataCache } from 'components/MetadataHier/lib/treeMemo';
import { openEditNoEvent } from 'components/MetadataHier/actions/edit/api/handleEdit';
import { TreeCMP } from 'components/TreeCMP';
import { MetadataHierActions, Actions } from 'components/MetadataHier/actions';
import { events } from 'components/MetadataHier/events';

interface IProps {
    server: string;
}
type IState = ScopeState;

const MULTI_SELECT_HINT =
    'Для выделения нескольких узлов дерева метаданных нажмите их, зажав клавишу Ctrl/⌘, ' +
    'а для снятия выделения нажмите на узел или свободное место без зажатой клавиши';

export class MetadataHier extends PureComponent<IProps, IState> {
    private treeCache = new TreeDataCache();

    private clickTimers = new Map<string, number>();

    private subName = `mh:${this.props.server}:${Math.random().toString(36).slice(2)}`;

    private changeSubName = `mh-change:${this.props.server}:${Math.random().toString(36).slice(2)}`;

    private isModifierPressed = false;

    private onKeyDown = (e: KeyboardEvent): void => {
        if ((e.ctrlKey || e.metaKey) !== this.isModifierPressed) {
            this.isModifierPressed = e.ctrlKey || e.metaKey;
            setMultiSelectMode(this.props.server, this.isModifierPressed);
        }
    };

    private onKeyUp = (e: KeyboardEvent): void => {
        if (this.isModifierPressed && !e.ctrlKey && !e.metaKey) {
            this.isModifierPressed = false;
            setMultiSelectMode(this.props.server, false);
        }
    };

    private onWindowBlur = (): void => {
        if (this.isModifierPressed) {
            this.isModifierPressed = false;
            setMultiSelectMode(this.props.server, false);
        }
    };

    constructor(props: IProps) {
        super(props);
        this.state = EMPTY_SCOPE;
    }

    componentDidMount(): void {
        StateManager.subscribeState({
            [scopeKey(this.props.server)]: { [this.subName]: this.sync },
            [changeNodeKey(this.props.server)]: { [this.changeSubName]: this.onChangeNode },
        });
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onWindowBlur);
        loadRoot(this.props.server).catch(console.error);
        this.sync();
        events._initialize(this.props.server);
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({
            [scopeKey(this.props.server)]: [this.subName],
            [changeNodeKey(this.props.server)]: [this.changeSubName],
        });
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onWindowBlur);
        this.clickTimers.forEach((t) => clearTimeout(t));
        this.clickTimers.clear();

        const sel = readMetadataSelected();
        if (sel?.server === this.props.server) writeMetadataSelected(null);

        saveTreePartial(this.props.server, readScope(this.props.server));
        clearScope(this.props.server);
        this.treeCache.reset();
    }

    private sync = (): void => {
        this.setState(readScope(this.props.server));
    };

    private onChangeNode = (): void => {
        applyChangeNode(this.props.server);
    };

    private onExpand = (node: TreeDataControlled): void => {
        const { server } = this.props;
        const { willLoad } = toggleExpanded(server, node.id);
        if (willLoad) loadChildren(server, node.id).catch(console.error);
    };

    private executeNodeEvent(server: string, nodeKey: string, eventConfig?: { name: string; props?: any }): void {
        // console.log(eventConfig)
        if (!eventConfig || eventConfig.name === 'handleNodeClick') {
            handleNodeClick(server, nodeKey);
            return;
        }
        if (eventConfig.name === 'openEditNoEvent') {
            openEditNoEvent(server, nodeKey);
            return;
        }
        const handler = (events as Record<string, Function>)?.[eventConfig.name];
        // console.log(eventConfig)
        if (handler) {
            handler(eventConfig.props || {}, { server, nodeKey });
        } else {
            console.warn(`Неизвестное событие: ${eventConfig.name}`);
        }
    }

    private onClick = (node: TreeDataControlled): void => {
        const { server } = this.props;
        const nodeKey = node.id;
        const nodeEvents = this.state.nodeEvents.get(nodeKey);
        if (this.clickTimers.has(nodeKey)) {
            clearTimeout(this.clickTimers.get(nodeKey)!);
            this.clickTimers.delete(nodeKey);

            this.executeNodeEvent(server, nodeKey, nodeEvents?.onDoubleClick ?? { name: 'openEditNoEvent' });
            return;
        }

        const timer = window.setTimeout(() => {
            this.clickTimers.delete(nodeKey);
            this.executeNodeEvent(server, nodeKey, nodeEvents?.onClick ?? { name: 'handleNodeClick' });
        }, 300);
        this.clickTimers.set(nodeKey, timer);
    };

    private onTreeAreaClick = (): void => {
        if (this.isModifierPressed) return;
        const { server } = this.props;
        const { selectedIds } = readScope(server);
        if (selectedIds.size > 0) clearSelectedIds(server);
    };

    private renderActions = (nodes: FlatTreeNode[]): ReactNode => {
        const { server } = this.props;

        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MetadataHierActions
                        actions={[
                            Actions.ADD,
                            Actions.SORT,
                            Actions.DELETE,
                            Actions.EDIT_ACCESS,
                            Actions.UPDATE,
                            Actions.OPEN_FILE_MANAGER,
                        ]}
                        nodes={nodes}
                        server={server}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip content={MULTI_SELECT_HINT} allowedPlacements={['top', 'bottom']}>
                        <IconButton icon={HelpIcon} variant="outlined" rounded />
                    </Tooltip>
                </div>
            </div>
        );
    };

    render() {
        const { server } = this.props;
        const { rootId, nodes, expandedIds, treeVersion, selectedIds } = this.state;
        const treeData = this.treeCache.getTreeData(rootId, nodes, expandedIds, selectedIds, treeVersion, server);
        return (
            <div style={{ height: '100%', display: 'flex' }}>
                <TreeCMP
                    server={server}
                    expandedNodes={[...expandedIds]}
                    onNodeExpand={this.onExpand}
                    onNodeClick={this.onClick}
                    current={getSelectedFlatNodes(server)}
                    data={treeData}
                    actions={this.renderActions}
                    onAreaClick={this.onTreeAreaClick}
                />
            </div>
        );
    }
}
