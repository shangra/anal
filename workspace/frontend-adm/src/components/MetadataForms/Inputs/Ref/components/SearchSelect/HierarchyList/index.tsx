import React from 'react';
import cn from 'classnames';
import { IMetadataForTable, MetadataSearchOptionsType } from 'components/Metadata/MetadataAPI/types';
import { SelectInfinityListItemType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/SelectInfinityList/types';
import Tree from 'ui/Tree/Tree';
import style from './index.module.css';

export type HierarchyListItemType = {
    title: string;
    value: string;
    needToLoading: boolean;
    children: HierarchyListItemType[];
    isLoading: boolean;
};

interface IHierarchyListState {
    error: boolean;
    offset: number;
    treeData: HierarchyListItemType[];
}

interface IHierarchyListProps {
    limit: number;
    offset?: number;
    getItemKey: (item: any) => string;
    loadMoreCallback: (
        options: MetadataSearchOptionsType,
        searchText: string,
        convertToValueLabelFormat?: boolean,
    ) => Promise<IMetadataForTable<SelectInfinityListItemType>>;
    toHierarchyListConverter: (items: any[]) => HierarchyListItemType[];
    searchText: string;
    onSelectOption: (selectedOption: HierarchyListItemType, keyboardEvent?: React.KeyboardEvent<any>) => void;
    listClassName?: string;
}

export class HierarchyList extends React.Component<IHierarchyListProps, IHierarchyListState> {
    constructor(props: IHierarchyListProps) {
        super(props);

        this.state = {
            error: false,
            offset: 0,
            treeData: [],
        };
    }

    private hierarchyField?: string;

    private loadMoreHierarchy = async (hierarchyFieldValue?: string) => {
        const options: MetadataSearchOptionsType = {
            limit: this.props.limit,
            offset: this.state.offset,
            hierarchy: true,
        };

        if (hierarchyFieldValue && this.hierarchyField) {
            options.where = { [this.hierarchyField]: hierarchyFieldValue };
        }

        const promise = this.props.loadMoreCallback(options, this.props.searchText, true);

        return promise
            .then((data) => {
                this.hierarchyField = data.hierarchy?.parentField?.field;
                return this.props.toHierarchyListConverter(data.rows).sort((item1, item2) => {
                    if (item1.title > item2.title) {
                        return 1;
                    }

                    if (item1.title < item2.title) {
                        return -1;
                    }

                    return 0;
                });
            })
            .catch((e) => {
                console.error(e);
                this.setState({ error: true });
                return [];
            });
    };

    async componentDidMount() {
        const items = await this.loadMoreHierarchy();
        this.setState({ treeData: items });
    }

    async componentDidUpdate(
        prevProps: Readonly<IHierarchyListProps>,
        prevState: Readonly<IHierarchyListState>,
        snapshot?: any,
    ) {
        if (this.props.searchText !== prevProps.searchText) {
            const items = await this.loadMoreHierarchy();
            this.setState({ treeData: items });
        }
        if ((this.props.offset || this.props.offset === 0) && this.props.offset !== prevProps.offset) {
            this.setState({ offset: this.props.offset }, async () => {
                const items = await this.loadMoreHierarchy();
                this.setState({ treeData: items });
            });
        }
    }

    updateItem = (array: HierarchyListItemType[], itemId: string, children: HierarchyListItemType[]): void => {
        const elementToUpdate = array.find((item) => item.value === itemId);

        if (elementToUpdate) {
            elementToUpdate.children = children;
            if (children.length === 0) {
                elementToUpdate.needToLoading = false;
            }
            elementToUpdate.isLoading = false;
            return;
        }

        array.forEach((item) => {
            this.updateItem(item.children, itemId, children);
        });
    };

    setLoading = (array: HierarchyListItemType[], itemId: string, isLoading: boolean) => {
        const result = array.map((item) => {
            if (item.value === itemId) item.isLoading = isLoading;
            if (item?.children?.length > 0) item.children = this.setLoading(item.children, itemId, isLoading);
            return { ...item };
        });

        return result;
    };

    getItemById = (id: string) => {
        this.setState((prevState) => {
            const data = [...prevState.treeData];
            this.setLoading(data, id, true);
            return { ...prevState, treeData: data };
        });

        this.loadMoreHierarchy(id).then((items) => {
            this.setState((prevState) => {
                const data = [...prevState.treeData];
                this.updateItem(data, id, items);
                return { ...prevState, treeData: data };
            });
        });
    };

    getMatadataItem = (item: HierarchyListItemType) => {
        this.getItemById(item.value);
    };

    render() {
        return (
            <div className={cn(style.hierarchyList, this.props.listClassName)}>
                <Tree
                    treeData={this.state.treeData}
                    onSelect={this.props.onSelectOption}
                    getChildren={this.getMatadataItem}
                    getItemKey={this.props.getItemKey}
                />
            </div>
        );
    }
}
