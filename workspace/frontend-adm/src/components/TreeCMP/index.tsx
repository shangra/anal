import { ChangeEvent, CSSProperties, MouseEvent, PureComponent, ReactNode } from 'react';
import { Input, TreeControlled, TreeDataControlled, FlatTreeNode, SearchIcon, ClearIcon } from 'ui-kit';
import { searchFn } from 'components/MetadataHier/lib/service';

interface IProps {
    server: string;
    current: FlatTreeNode[];
    data: FlatTreeNode[];
    actions?: (nodes: FlatTreeNode[]) => ReactNode;
    onNodeClick: (node: TreeDataControlled) => void;
    onNodeExpand: (node: TreeDataControlled) => void;
    expandedNodes: string[];
    onAreaClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

interface IState {
    searchValue: string;
    searchCount: number;
}

export class TreeCMP extends PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            searchValue: '',
            searchCount: -1,
        };
    }

    private static rootStyle: CSSProperties = {
        height: '100%',
        minHeight: '500px',
        minWidth: '300px',
        boxSizing: 'border-box',
        padding: '8px',
        width: '100%',
    };

    private static inputStyle: CSSProperties = {
        borderRadius: '16px',
        width: '100%',
        margin: '8px 0',
    };

    private static emptyTextStyle: CSSProperties = {
        margin: '8px 0',
        textAlign: 'center',
    };

    private static treeStyle: CSSProperties = { padding: 0, height: 'calc(100% - 72px)' };

    private onSearch = (value: string) => this.setState({ searchValue: value });

    private onInputChange = (e: ChangeEvent<HTMLInputElement>) => this.setState({ searchValue: e.target.value });

    private search = (_data: unknown, value: string): FlatTreeNode[] => {
        const result = searchFn(this.props.server, value);
        this.setState({ searchCount: result.length });
        return result;
    };

    private onTreeAreaClick = (e: MouseEvent<HTMLDivElement>): void => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest('.tree-cmp')) return;
        if (target.closest('.tree-item-container')) return;
        this.props.onAreaClick?.(e);
    };

    private clearSearch = () => this.setState({ searchValue: '', searchCount: -1 });

    render() {
        const { current, data, actions, expandedNodes, onNodeClick, onNodeExpand, onAreaClick } = this.props;

        return (
            <div style={TreeCMP.rootStyle} onClick={onAreaClick ? this.onTreeAreaClick : undefined}>
                {actions && actions(current)}
                <Input
                    style={TreeCMP.inputStyle}
                    value={this.state.searchValue}
                    onChange={this.onInputChange}
                    variant="outlined"
                    placeholder="Поиск..."
                    leftIcon={SearchIcon}
                    rightIcon={this.state.searchValue ? ClearIcon : undefined}
                    onClickRightIcon={this.clearSearch}
                    rounded
                />
                <TreeControlled
                    data={data}
                    expandedNodes={expandedNodes}
                    onNodeExpand={onNodeExpand}
                    onNodeClick={onNodeClick}
                    maxLevel={10}
                    // нельзя использовать обычный this.state.searchCount === 0 && ..., иначе дерево перестанет работать
                    style={{ ...TreeCMP.treeStyle, display: this.state.searchCount === 0 ? 'none' : 'block' }}
                    fallback={<p>Ничего не найдено</p>}
                    searchValue={this.state.searchValue}
                    onSearch={this.onSearch}
                    searchFn={this.search}
                    className="tree-cmp"
                />
                {this.state.searchCount === 0 && (
                    <p style={TreeCMP.emptyTextStyle}>Не найдено элементов, соответствующих поиску</p>
                )}
            </div>
        );
    }
}
