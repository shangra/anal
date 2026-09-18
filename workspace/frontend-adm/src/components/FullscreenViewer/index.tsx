import React, { Component } from 'react';

import { IconButton, MoreIcon } from 'ui-kit';
import { v4 } from 'uuid';
import $windows from 'components/WindowsCMP/windows.helper';

interface IFullscreenViewerProps {
    children: React.ReactNode;
}

interface IFullscreenViewerState {
    windowId: string;
}

export class FullscreenViewer extends Component<IFullscreenViewerProps, IFullscreenViewerState> {
    constructor(props: IFullscreenViewerProps) {
        super(props);

        this.state = {
            windowId: '',
        };
    }

    componentDidMount() {
        this.setState({
            windowId: v4(),
        });
    }

    onClick = () => {
        $windows.open('Новое окно', this.props.children, { uuid: this.state.windowId });
    };

    render() {
        return <IconButton icon={MoreIcon} onClick={this.onClick} style={{ marginBottom: 8 }} variant="outlined" rounded />;
    }
}
