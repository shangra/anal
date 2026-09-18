import { Component, type ReactNode } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
    top?: number;
    left?: number;
    children?: ReactNode;
}

export class ContextMenu extends Component<ContextMenuProps> {
    render(): ReactNode {
        return (
            <div className="MenuContextContainer ContextMenu" style={{ top: this.props.top, left: this.props.left }}>
                {this.props.children}
            </div>
        );
    }
}
