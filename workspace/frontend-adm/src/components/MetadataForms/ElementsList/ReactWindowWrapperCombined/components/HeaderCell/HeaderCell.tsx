import React, { Component, CSSProperties, ReactNode } from 'react';
import { ArrowDownIcon, ArrowUpIcon, IconButton } from 'ui-kit';
import { IColumn } from 'components/MetadataForms/ElementsList/types';
import classes from './HeaderCell.module.css';
import classNames from 'classnames';

interface IHeaderCellProps {
    name: string;
    styles?: CSSProperties;
    resizable?: boolean;
    onSort?: (value: 'ASC' | 'DESC') => void;
    orderValue?: "DESC" | "ASC" | null;
    handleResizeStart?: (startX: number) => void;
    handleResize?: (currentX: number) => void;
    handleResizeEnd?: () => void;
    onClick?: () => void;
    renderContent?: () => ReactNode;
}

interface IHeaderCellState {}

const cellStyles: CSSProperties = {
    backgroundColor: 'var(--table-header-background-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 20px',
    fontSize: '14px',
    overflow: 'hidden',
    gap: 5,
    position: 'absolute',
};

export class HeaderCell extends Component<IHeaderCellProps, IHeaderCellState> {
    private isResizing = false;

    private resizeHandleRef = React.createRef<HTMLDivElement>();

    componentDidMount() {
        document.addEventListener('mouseup', this.handleGlobalMouseUp);
    }

    componentWillUnmount() {
        document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    }

    handleGlobalMouseUp = () => {
        if (this.isResizing) {
            this.isResizing = false;
            this.props.handleResizeEnd?.();
        }
    };

    resizeColumnStart = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        this.isResizing = true;
        
        if (!this.props.handleResizeStart) return;
        this.props.handleResizeStart(event.clientX);
        
        document.addEventListener('mousemove', this.handleMouseMove);
    };

    handleMouseMove = (e: MouseEvent) => {
        if (this.isResizing && this.props.handleResize) {
            this.props.handleResize(e.clientX);
        }
    };

    handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        // Если клик был на элементе ресайза - игнорируем
        if (this.resizeHandleRef.current?.contains(event.target as Node)) return;

        this.props.onSort?.(this.props.orderValue === 'DESC' ? 'ASC' : 'DESC');
        this.props.onClick?.();
    };

    render(): ReactNode {
        return (
            <div className="noselect" style={{ ...this.props.styles, ...cellStyles }} onClick={this.handleClick}>
                <div 
                    className={classes.columnName} 
                    title={this.props.name}
                >{this.props.renderContent ? this.props.renderContent() : this.props.name}</div>
                {this.props.orderValue ? (
                    <IconButton
                    style={{flexShrink: 0}}
                        variant="text"
                        size="small"
                        icon={this.props.orderValue === 'ASC' ? ArrowUpIcon : ArrowDownIcon}
                     />
                ) : null}
                {this.props.resizable ? (
                    <div 
                        ref={this.resizeHandleRef}
                        className={classNames(classes.columnDragger)} 
                        onMouseDown={this.resizeColumnStart}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : null}
            </div>
        );
    }
}