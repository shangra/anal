import { Component } from 'react';
import { TreeSelect, type TreeSelectOption } from 'ui-kit';

import $api from 'helpers/axios';
import { buildUrl } from 'helpers/buildUrl';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import {
    FormGRefMetadataLink,
    FormGRefValue,
    TreeRefProps as TreeRefPropsType,
    TreeRefState,
} from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/types';

/** Узел первого уровня, который возвращает /metadata/links */
type RootLink = {
    id: string;
    name: string;
    description?: string;
    parent?: string;
    class_id: string;
    class?: string;
    manifest?: string;
    rank?: number;
};

/**
 * Глобальные рефы (data.link.type === 'global') — рендерятся в TreeSelect
 * с ленивой (on-demand) загрузкой:
 *  - /metadata/links           — узлы первого уровня (parent=ROOT_ID);
 *  - /metadata/link/{parentId} — дочерние узлы конкретного родителя;
 *  - уже загруженные узлы кэшируются в loadedNodes;
 *  - при наличии value.link — узел автоматически раскрывается,
 *    и подгружаются дети для выделения value.value.
 */
export class TreeRef extends Component<TreeRefPropsType, TreeRefState> {
    constructor(props: TreeRefPropsType) {
        super(props);

        this.state = {
            treeData: [],
            treeDataLoaded: false,
            treeDataLoading: false,
            expandedNodes: [],
            loadedNodes: [],
            treeDataKey: 0,
        };
    }

    componentDidMount() {
        this.loadRootLevel();
    }

    componentDidUpdate(prevProps: TreeRefPropsType) {
        // Если поменялся целевой dataName (компонент переиспользуется в другой роли) — перезагрузить корень
        if (prevProps.dataName !== this.props.dataName) {
            this.setState((prev) => ({
                treeData: [],
                treeDataLoaded: false,
                treeDataLoading: false,
                expandedNodes: [],
                loadedNodes: [],
                treeDataKey: prev.treeDataKey + 1,
            }));
            this.loadRootLevel();
        }
    }

    /** Сопоставление узла первого уровня с опцией TreeSelect: всегда expandable, нельзя выбрать. */
    private mapRootLinkToOption = (item: RootLink): TreeSelectOption<string> => ({
        value: item.id,
        label: item.name || item.description || item.id,
        title: item.description || item.name,
        disabled: true,
        expandable: true,
        children: [],
    });

    /** Сопоставление дочернего узла: можно выбрать; expandable=false (по СПЕК раскрываются только узлы 1-го уровня). */
    private mapChildLinkToOption = (item: FormGRefMetadataLink): TreeSelectOption<string> => ({
        value: item.id,
        label: item.name || item.description || item.id,
        title: item.description || item.name,
        disabled: false,
        expandable: false,
        children: [],
    });

    /** Заменить узел в дереве по value (создаёт новое дерево для чистой иммутабельности). */
    private replaceNode(
        nodes: TreeSelectOption<string>[],
        targetValue: string,
        updater: (node: TreeSelectOption<string>) => TreeSelectOption<string>,
    ): TreeSelectOption<string>[] {
        return nodes.map((node) => {
            if (node.value === targetValue) {
                return updater(node);
            }
            if (node.children?.length) {
                return { ...node, children: this.replaceNode(node.children, targetValue, updater) };
            }
            return node;
        });
    }

    private findNode = (nodes: TreeSelectOption<string>[], value: string): TreeSelectOption<string> | null => {
        for (const node of nodes) {
            if (node.value === value) {
                return node;
            }
            if (node.children?.length) {
                const found = this.findNode(node.children, value);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    loadRootLevel = async () => {
        const { server } = this.props;
        if (this.state.treeDataLoaded || this.state.treeDataLoading) {
            return;
        }
        this.setState({ treeDataLoading: true });
        try {
            const url = buildUrl(server, 'metadata/links');
            const response = await $api.get<RootLink[]>(url);
            const items = response.data || [];
            const treeData = items.map(this.mapRootLinkToOption);

            this.setState(
                {
                    treeData,
                    treeDataLoaded: true,
                    treeDataLoading: false,
                },
                () => {
                    this.applyInitialExpand();
                },
            );
        } catch (error) {
            console.error('Ошибка загрузки корневого уровня дерева:', error);
            this.setState({ treeData: [], treeDataLoaded: true, treeDataLoading: false });
        }
    };

    loadChildren = async (parentId: string) => {
        const { server, value } = this.props;
        if (!parentId) {
            return;
        }
        if (this.state.loadedNodes.includes(parentId)) {
            return; // уже загружено — повторного запроса не будет
        }

        // Помечаем узел как loading=true
        this.setState((prev) => ({
            treeData: this.replaceNode(prev.treeData, parentId, (node) => ({
                ...node,
                loading: true,
            })),
        }));

        try {
            const url = buildUrl(server, `metadata/link/${parentId}`);
            const response = await $api.get<FormGRefMetadataLink[]>(url);
            const items = response.data || [];
            const children = items.map(this.mapChildLinkToOption);
            const expandable = items.length > 0;

            this.setState(
                (prev) => ({
                    treeData: this.replaceNode(prev.treeData, parentId, (node) => ({
                        ...node,
                        children,
                        loading: false,
                        expandable,
                    })),
                    loadedNodes: [...prev.loadedNodes, parentId],
                }),
                () => {
                    // При авто-раскрытии нужно дождаться загрузки детей — иначе value не подсветится
                    if (typeof value === 'object' && value?.link === parentId && value?.value) {
                        this.setState((prev) => ({
                            treeDataKey: prev.treeDataKey + 1,
                        }));
                        // перерендер с новыми детьми — TreeSelect получит expandedNodes и value
                    }
                },
            );
        } catch (error) {
            console.error(`Ошибка загрузки дочерних узлов для ${parentId}:`, error);
            this.setState((prev) => ({
                treeData: this.replaceNode(prev.treeData, parentId, (node) => ({
                    ...node,
                    loading: false,
                })),
            }));
        }
    };

    /** При наличии value.link — раскрыть узел первого уровня и подгрузить его детей. */
    private applyInitialExpand = () => {
        const { value } = this.props;
        if (typeof value !== 'object' || !value?.link) {
            return;
        }
        if (this.state.expandedNodes.includes(value.link)) {
            return;
        }
        this.setState(
            (prev) => ({
                expandedNodes: [...prev.expandedNodes, value.link as string],
            }),
            () => {
                this.loadChildren(value.link);
            },
        );
    };

    onExpand = (next: string[], change?: { node: string; action: 'expanded' | 'collapsed' }) => {
        this.setState({ expandedNodes: next });
        if (change?.action === 'expanded') {
            this.loadChildren(change.node);
        }
    };

    onChangeLink = (selected: string) => {
        const { value } = this.props
        const prevValue = typeof value === 'object' ? value?.value : value;
        if (selected === undefined || prevValue === selected) {
            this.props.onChange?.(this.props.dataName, {}, {});
            return;
        }

        const findParentValue = (nodes: TreeSelectOption<string>[], targetValue: string): string | null => {
            for (const node of nodes) {
                if (node.children?.length) {
                    for (const child of node.children) {
                        if (child.value === targetValue) {
                            return node.value;
                        }
                        const found = findParentValue([child], targetValue);
                        if (found) {
                            return found;
                        }
                    }
                }
            }
            return null;
        };

        const parentId = findParentValue(this.state.treeData, selected) ?? '';
        const refValue: FormGRefValue = { link: parentId, value: selected };

        this.props.onChange?.(this.props.dataName, refValue, {
            [this.props.dataName]: { id: selected } as FormGRefMetadataLink,
        });
    };

    render() {
        const { description, value } = this.props;
        const currentValue = typeof value === 'object' ? value?.value : value;

        return (
            <FormInputWrapper description={description}>
                <TreeSelect
                    treeOptions={this.state.treeData}
                    value={currentValue}
                    onChange={this.onChangeLink}
                    onExpand={this.onExpand}
                    expandedNodes={this.state.expandedNodes}
                    placeholder="Выберите элемент"
                    fullWidth
                    hasSearch
                    loading={!this.state.treeDataLoaded}
                    key={String(this.state.treeDataKey)}
                    popoverOffset={16}
                />
            </FormInputWrapper>
        );
    }
}
