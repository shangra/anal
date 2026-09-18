import { Component, ReactNode } from 'react';
import { TableIcon, IconButton } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import StateManager from 'lite-react-statemanager';
import { ChangeNodePayload } from './types';
import { MatrixTable } from 'components/MatrixTable';
import { v4 } from 'uuid';

interface MetaMatrixProps {
    title?: string;
    server: string;
}

export class MetaMatrix extends Component<MetaMatrixProps, {}> {
    private server: string;

    private changeSubName = `mh-change:${this.props.server}:${Math.random().toString(36).slice(2)}`;

    constructor(props: MetaMatrixProps) {
        super(props);
        this.server = (props.server || '').replace(/\/+$/gm, '');
    }

    copyMetadata = async (): Promise<void> => {
        const cmp = <MatrixTable server={this.server} />;
        const uuid = v4();
        $windows.open('Матрицы', cmp, {
            width: '1000px',
            height: 'fit-content',
            uuid: `Matrix::${uuid}`,
        });
    };

    componentDidMount(): void {
        StateManager.subscribeState({
            changeNode: { [this.changeSubName]: this.onChangeNode },
        });
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({
            changeNode: [this.changeSubName],
        });
    }

    private onChangeNode = async (data: ChangeNodePayload): Promise<void> => {
        const { changeNode } = data;
        if (!changeNode.manifest?.name) return;
        $windows.rename(`Matrix::${changeNode.nodeId}`, changeNode.manifest?.name);
    };

    render(): ReactNode {
        return (
            <div>
                <IconButton title={this.props.title} icon={TableIcon} onClick={this.copyMetadata} variant="outlined" rounded />
            </div>
        );
    }
}
