import { Component } from 'react';
import MyIcon from '../../MyIcon/MyIcon';
import style from './TreeItem.module.css';
import cn from 'classnames';
import { Loader } from 'ui-kit';

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
        const titleStyle = `ms-2 ${style.title} ${this.props.item.active ? style.titleActive : ''}`;
        const expandButtonStyle = `${style.expandButton} ${this.state.isExpanded ? style.rotate : ''} ${
            showExpandButton ? '' : style.hidden
        }`;
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
                    {this.props.item?.isLoading ? (
                        <Loader size={'small'} color="#87A5B3"/>
                    ) : (
                        <MyIcon
                            className={expandButtonStyle}
                            icon="bi bi-caret-right-fill"
                            onClick={this.toggleExpand}
                            size={10}
                        />
                    )}
                </div>
            </>
        );

        return (
            <>
                <div className={cn('d-flex mt-1 mb-1 w-max-content', this.props.treeItemClassname)}>
                    {!this.props.treeItemContent && indentBlockWithToggler}

                    <div
                        onClick={this.onSelectItem}
                        className={this.props.treeItemContent ? this.props.treeItemContentClassname : titleStyle}
                    >
                        {this.props.treeItemContent
                            ? this.props.treeItemContent(this.props.item, indentBlockWithToggler)
                            : this.props.item.title}
                    </div>
                </div>
                <div className={`${submenuStyle}`}>
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
