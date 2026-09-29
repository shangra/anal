import { Component } from 'react';
import { ListItem, IconButton, PlusIcon, MinusIcon } from 'ui-kit';
import style from './TreeItem.module.css';
import cn from 'classnames';

class TreeItem extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isExpanded: props.item.isExpanded ?? false,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.item?.children?.length > 0 && !this.props.item?.children?.length > 0) {
            this.setState((prevState) => ({
                isExpanded: !prevState.isExpanded,
            }));
        }
    }

    toggleExpand = () => {
        this.setState((prevState) => ({
            isExpanded: !prevState.isExpanded,
        }));
        if (this.props.item?.needToLoading && !this.props.item?.children?.length > 0) {
            if (this.props.getChildren) this.props.getChildren(this.props.item);
        }
    };

    onSelectItem = () => {
        if (this.props.onSelect) {
            this.props.onSelect(this.props.item);
        }
    };

    render() {
        const length = this.props.item.children?.length ?? 0;
        const showExpandButton = length > 0 || this.props.item?.needToLoading;

        const indentSize = Number(this.props.indentSize ?? 24);
        const currentIndentLevel = Number(this.props.indentLevel ?? 0);
        const indent = currentIndentLevel * indentSize;
        const nextIndentLevel = currentIndentLevel + 1;

        const submenuStyle = `${style.subMenu} ${this.state.isExpanded ? style.expanded : ''}`;

        const indentBlockWithToggler = (
            <>
                {!!currentIndentLevel && (
                    <div
                        style={{
                            minWidth: indent,
                            minHeight: indentSize,
                            maxWidth: indent,
                            maxHeight: indent,
                            display: 'inline-block',
                        }}
                    />
                )}
                <div className="d-flex align-items-center justify-content-center">
                    <IconButton
                        icon={this.state.isExpanded ? MinusIcon : PlusIcon}
                        onClick={this.toggleExpand}
                        size="small"
                        variant="text"
                        color="primary"
                        title={this.state.isExpanded ? 'Свернуть' : 'Развернуть'}
                        className={showExpandButton ? '' : style.hidden}
                        loading={this.props.item?.isLoading}
                    />
                </div>
            </>
        );

        const {
            label,
            icon,
            'data-el-id': dataElId,
            testId,
            className: itemClassName,
            style: itemStyle,
            avatar,
            title: tooltipTitle,
            hint,
            count,
            actions,
            status,
            type = 'single',
            checked,
            disabled,
            multiline,
            onChange,
            onClick,
            onMouseEnter,
            onMouseLeave,
            onMouseDown,
            onMouseUp,
        } = this.props.item;

        return (
            <>
                <div className={cn('d-flex mt-1 mb-1 w-max-content', this.props.treeItemClassname)}>
                    {!this.props.treeItemContent && <div style={{ display: 'flex' }}>{indentBlockWithToggler}</div>}

                    {this.props.treeItemContent ? (
                        this.props.treeItemContent(this.props.item, indentBlockWithToggler)
                    ) : (
                        <ListItem
                            label={label ?? this.props.item.title}
                            icon={icon}
                            avatar={avatar}
                            data-el-id={dataElId}
                            testId={testId}
                            className={cn(itemClassName, this.props.treeItemContentClassname)}
                            style={itemStyle}
                            title={tooltipTitle ?? this.props.item.title}
                            hint={hint}
                            count={count}
                            actions={actions}
                            status={status}
                            type={type}
                            checked={checked}
                            disabled={disabled}
                            multiline={multiline}
                            onChange={onChange}
                            onClick={(e) => {
                                this.onSelectItem();
                                if (onClick) onClick(e);
                            }}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onMouseDown={onMouseDown}
                            onMouseUp={onMouseUp}
                        />
                    )}
                </div>

                <div className={submenuStyle}>
                    {length > 0 &&
                        this.props.item.children.map((child) => (
                            <TreeItem
                                key={
                                    this.props.getItemKey
                                        ? this.props.getItemKey(child, this.props.currentIndentLevel)
                                        : child.key
                                }
                                getItemKey={this.props.getItemKey}
                                indentLevel={nextIndentLevel}
                                onSelect={this.props.onSelect}
                                item={child}
                                treeItemClassname={this.props.treeItemClassname}
                                treeItemContent={this.props.treeItemContent}
                                treeItemContentClassname={this.props.treeItemContentClassname}
                                getChildren={this.props.getChildren}
                            />
                        ))}
                </div>
            </>
        );
    }
}

export default TreeItem;