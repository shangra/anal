import { Component } from 'react';
import TreeItem from './TreeItem/TreeItem';
import style from './Tree.module.css';

class Tree extends Component {
    render() {
        return (
            <div className={`${style.tree}`}>
                {this.props.treeData.map((item) => (
                    <TreeItem
                        key={this.props.getItemKey ? this.props.getItemKey(item) : item.key}
                        getItemKey={this.props.getItemKey}
                        onSelect={this.props.onSelect}
                        treeItemClassname={this.props.treeItemClassname}
                        treeItemContent={this.props.treeItemContent}
                        treeItemContentClassname={this.props.treeItemContentClassname}
                        item={item}
                        getChildren={this.props.getChildren}
                    />
                ))}
            </div>
        );
    }
}

export default Tree;
