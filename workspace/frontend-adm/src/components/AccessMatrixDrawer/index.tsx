import { PureComponent } from 'react';
import StateManager from 'lite-react-statemanager';
import { AccessMatrix } from 'components/AccessMatrix';
import { Drawer } from 'ui-kit';
import style from './drawer.module.css';
import { hasRule } from 'helpers/hasRule.helper';

interface AccessMatrixState {
    nodeId: string | null;
    tableName: string | null;
    server: string;
    opened: boolean;
}

export class AccessMatrixDrawer extends PureComponent<{}, AccessMatrixState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            nodeId: null,
            tableName: null,
            server: '',
            opened: false,
        };

        this.openNewNode = this.openNewNode.bind(this);
        this.onDrawerClose = this.onDrawerClose.bind(this);
    }

    componentDidMount(): void {
        StateManager.subscribeState({ nodeAccess: { openNewNode: this.openNewNode } });
    }

    openNewNode(state: {
        nodeAccess: { nodeId: string; tableName: string; server: string };
    }): void {
        const { nodeId, tableName, server } = state.nodeAccess;
        this.setState(
            (prev) => ({
                ...prev,
                nodeId,
                tableName: tableName ?? prev.tableName,
                server: server ?? prev.server,
                opened: true,
            }),
            () => {
                const drawerElement = document.querySelector('.access-matrix-drawer');
                if (drawerElement) {
                    drawerElement.parentElement!.style.zIndex = '10011';
                }
            },
        );
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({ nodeAccess: ['openNewNode'] });
    }

    onDrawerClose(opened: boolean) {
        this.setState({ opened });
    }

    render() {
        const { nodeId, tableName, server } = this.state;
        if (!nodeId) {
            return null;
        }
        return (
            <Drawer
                position="right"
                opened={this.state.opened}
                title="Редактирование доступа"
                onSetOpen={this.onDrawerClose}
                width="500px"
                classNames={style["access-matrix-drawer"]}
                lockScroll
            >
                {hasRule('MetadataAccessRead')
                    ? <AccessMatrix id={nodeId} tableName={tableName || undefined} server={server} separate />
                    : <div className={style.noAccess}>Нет доступа</div>
                }
            </Drawer>
        );
    }
}
