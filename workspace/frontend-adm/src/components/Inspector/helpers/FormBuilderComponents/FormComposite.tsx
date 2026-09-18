import { Component, type ReactNode } from 'react';
import './FormComposite.css';
import { TreeMultiSelect } from 'ui-kit';
import $api from 'helpers/axios';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';
import { buildUrl } from 'helpers/buildUrl';

interface OptionMeta {
    type: number;
    link?: string;
}

interface TreeOption {
    value: string;
    disabled?: boolean;
    children?: TreeOption[];
    link?: string;
    type?: number;
    label: string;
}

interface FormCompositeState {
    treeOptions: TreeOption[];
    treeValues: string[];
    optionsMap: Map<string, OptionMeta>;
    server: string;
    loading: boolean;
}

/**
 * Разворачивает вложенное дерево опций в плоский Map для быстрого поиска type/link по value
 * @param options - опции дерева
 * @returns карта value → { type, link }
 */
function flattenOptionsMap(options: TreeOption[]): Map<string, OptionMeta> {
    const map = new Map<string, OptionMeta>();
    for (const node of options) {
        if (!node.disabled) {
            map.set(node.value, { type: node.type ?? 0, link: node.link });
        }
        if (node.children?.length) {
            const childMap = flattenOptionsMap(node.children);
            for (const [key, val] of childMap) {
                map.set(key, val);
            }
        }
    }
    return map;
}

export class FormComposite extends Component<FormComponentProps, FormCompositeState> {
    constructor(props: FormComponentProps) {
        super(props);

        const value = this.props.forceValue ?? this.props.value ?? [];

        this.state = {
            treeOptions: [],
            treeValues: Array.isArray(value)
                ? value.map((v: unknown) => (typeof v === 'object' ? (v as { value: string }).value ?? '' : String(v)))
                : [],
            optionsMap: new Map(),
            server: this.props.server ?? '',
            loading: true,
        };
    }

    buildOptionsMap(treeOptions: TreeOption[]): Map<string, OptionMeta> {
        return flattenOptionsMap(treeOptions);
    }

    getList(): void {
        const url = buildUrl(this.state.server, 'metadata/metacompositehelper/tree');
        $api.get(url)
            .then((res: { data: TreeOption[] }) => {
                const treeOptions = res.data;
                const optionsMap = this.buildOptionsMap(treeOptions);
                this.setState({ treeOptions, optionsMap }, () => {
                    this.syncTreeValuesToTree();
                });
            })
            .catch((error: Error) => {
                console.error(error);
            })
            .finally(() => {
                this.setState({ loading: false });
            });
    }

    /** Резолвит treeValues из API-значений в значения узлов дерева */
    syncTreeValuesToTree(): void {
        const currentValues = this.state.treeValues;
        const resolved = currentValues.map((apiValue) => {
            // 1. Прямой match в optionsMap
            if (this.state.optionsMap.has(apiValue)) {
                return apiValue;
            }
            // 2. Рекурсивный поиск узла по label — бэкенд хранит label, а не value
            const node = this.findNodeByLabel(this.state.treeOptions, apiValue);
            return node ? node.value : apiValue;
        });

        // Обновляем только если есть разница
        const hasChanged = resolved.some((v, i) => v !== currentValues[i]);
        if (hasChanged) {
            this.setState({ treeValues: resolved });
        }
    }

    findNodeByLabel(labels: TreeOption[], target: string): TreeOption | null {
        for (const node of labels) {
            if (node.label === target) return node;
            if (node.children) {
                const found = this.findNodeByLabel(node.children, target);
                if (found) return found;
            }
        }
        return null;
    }

    componentDidMount(): void {
        this.getList();
    }

    onChange = (selectedValues: string[] | null): void => {
        // Если дерево ещё не загружено, не очищаем значение — сохраняем оригинальное
        if (this.state.loading || this.state.treeOptions.length === 0) {
            return;
        }

        if (!Array.isArray(selectedValues)) {
            this.props?.onChange?.(this.props.data.name, []);
            return;
        }

        const { optionsMap } = this.state;

        const compositeValues = selectedValues
            .map((val) => {
                const meta = optionsMap.get(val);
                if (!meta) return null;
                return {
                    type: meta.type,
                    value: val,
                    ...(meta.link ? { link: meta.link } : {}),
                };
            })
            .filter(Boolean);

        this.props?.onChange?.(this.props.data.name, compositeValues);
    };

    componentDidUpdate(prevProps: FormComponentProps): void {
        const newValue = this.props.forceValue ?? this.props.value ?? [];
        const newTreeValues = Array.isArray(newValue)
            ? newValue.map((v: unknown) => (typeof v === 'object' ? (v as { value: string }).value : v))
            : [];
        const oldTreeValues = Array.isArray(prevProps.value)
            ? prevProps.value.map((v: unknown) => (typeof v === 'object' ? (v as { value: string }).value : v))
            : [];
        const currentValues = [...new Set(newTreeValues)];
        const prevValues = [...new Set(oldTreeValues)];
        const isEquivalent =
            currentValues.length === prevValues.length && currentValues.every((elem) => prevValues.includes(elem));
        if (!isEquivalent) {
            this.setState({ treeValues: currentValues as string[] }, () => {
                this.syncTreeValuesToTree();
            });
        }
    }

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                <div style={{ width: '100%' }}>
                    <TreeMultiSelect
                        fullWidth
                        hasSearch
                        autoExpand
                        treeOptions={this.state.treeOptions}
                        value={this.state.treeValues}
                        onChange={this.onChange}
                        loading={this.state.loading}
                        key={String(this.state.treeOptions.length)}
                        popoverOffset={16}
                    />
                </div>
            </FormInputWrapper>
        );
    }
}
