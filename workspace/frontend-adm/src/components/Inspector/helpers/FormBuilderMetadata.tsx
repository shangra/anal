import React, { PureComponent } from 'react';
import { FormInteger } from 'components/Inspector/helpers/FormBuilderComponents/FormInteger';
import { FormString } from 'components/Inspector/helpers/FormBuilderComponents/FormString';
import { FormReal } from 'components/Inspector/helpers/FormBuilderComponents/FormReal';
import { FormList } from 'components/Inspector/helpers/FormBuilderComponents/FormList';
import { FormBool } from 'components/Inspector/helpers/FormBuilderComponents/FormBool';
import { FormJson } from 'components/Inspector/helpers/FormBuilderComponents/FormJson';
import { FormText } from 'components/Inspector/helpers/FormBuilderComponents/FormText';
import { FormDate } from 'components/Inspector/helpers/FormBuilderComponents/FormDate';
import { FormDateTime } from 'components/Inspector/helpers/FormBuilderComponents/FormDateTime';
import { FormComposite } from 'components/Inspector/helpers/FormBuilderComponents/FormComposite';
import { FormGRef } from 'components/Inspector/helpers/FormBuilderComponents/FormGRef';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { ClearIcon, Input, SearchIcon } from 'ui-kit';
import { FormColorPicker } from 'components/Inspector/helpers/FormBuilderComponents/FormColorPicker';
import { evaluateCondition, extractFieldNames, validateNoCyclicDependencies } from 'helpers/formBuilderConditions';
import type { FormFieldItem, FormSchema, FormOnChange, FormComponentProps, FormParentInfo } from 'components/Inspector/types';
import type { NormalizedNode } from 'components/MetadataHier/types';
import { FilterObject } from 'components/Inspector/conditionTypes';
import {
    FormGRefFormValues,
    FormGRefData,
    FormGRefMetadataLink,
    FormGRefValue,
} from 'components/Inspector/helpers/FormBuilderComponents/FormGRef/types';

type FormColorPickerData = {
    name: string;
    description?: string;
    default?: string | null;
    showAlpha?: boolean;
    showRecent?: boolean;
};

type FormColorPickerOnChange = (name: string, value: string | null) => void;

interface FormBuilderMetadataProps {
    server?: string;
    formValues: Record<string, unknown>;
    parentInfo: FormParentInfo;
    nodeForm: FormSchema;
    node: NormalizedNode;
    onChange: FormOnChange;
    onLoadData: (parentInfo: FormParentInfo) => void;
    isParentForm: boolean;
    components: { GetComponent: (name: string) => React.ComponentType<unknown> } | null;
}

interface FormBuilderMetadataState {
    values: Record<string, unknown>;
    parentInfo: FormParentInfo;
    autoDescription: boolean;
    searchQuery: string;
}

export class FormBuilderMetadata extends PureComponent<FormBuilderMetadataProps, FormBuilderMetadataState> {
    private server: string;

    constructor(props: FormBuilderMetadataProps) {
        super(props);

        let autoDescription = false;
        const name = props.formValues['manifest.name'];
        const description = props.formValues['manifest.description'];
        if (description === this.convertNameToDescription(name)) autoDescription = true;

        this.state = {
            values: props.formValues,
            parentInfo: props.parentInfo,
            autoDescription,
            searchQuery: '',
        };

        this.server = (props.server || '').replace(/\/+$/gm, '');
    }

    componentDidUpdate(prevProps: FormBuilderMetadataProps): void {
        if (JSON.stringify(prevProps.formValues) === JSON.stringify(this.props.formValues)) {
            return;
        }
        this.setState({
            values: this.props.formValues,
        });
    }

    onLoadData = (parentInfo: FormParentInfo = {}): void => {
        this.setState(
            (prevState) => ({
                parentInfo: {
                    ...prevState.parentInfo,
                    ...parentInfo,
                },
            }),
            () => {
                if (this.state.parentInfo) {
                    this.props?.onLoadData(this.state.parentInfo);
                }
            },
        );
    };

    itemHandleChange: FormOnChange = (key, value, parentInfo = {}) => {
        const handler: FormOnChange = (k, v, p) => {
            this.setState(
                // @ts-ignore
                (prevState) => {
                    const newValues = { ...prevState.values, [k]: v };
                    return {
                        values: newValues,
                        parentInfo: { ...prevState.parentInfo, ...p },
                    };
                },
                () => {
                    if (this.state.values) {
                        // @ts-expect-error - values передаётся как name, несовместимо с FormOnChange, но код работал в JS
                        this.props.onChange(this.state.values as Record<string, any>, this.state.parentInfo);
                    }
                },
            );
        };
        handler(key, value, parentInfo);
    };

    cleanString(str: unknown): string {
        if (str == null) return '';
        const value = String(str);

        // Удаляем всё, кроме букв и чисел
        const cleaned = value.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');

        // Проверка первой буквы строки
        if (!cleaned || !/^[a-zA-Zа-яА-Я]/.test(cleaned)) {
            return '';
        }

        return cleaned;
    }

    capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    convertNameToDescription(name: unknown): string {
        if (name == null) return '';
        const source = String(name);

        const description = source
            .split('')
            .map((char, index) => {
                if (/[A-ZА-ЯЁ]/.test(char)) {
                    const prevChar = source[index - 1];
                    if (!(prevChar && /\s/.test(prevChar))) {
                        return ` ${char.toLowerCase()}`;
                    }
                }
                return char;
            })
            .join('');

        return this.capitalizeFirstLetter(description.trim());
    }

    onChangeName = (key: string, value: string, parentInfo: FormParentInfo = {}): void => {
        const cleaned = this.cleanString(value ?? '');
        this.itemHandleChange(key, cleaned, parentInfo);
        if (this.state.autoDescription) {
            const description = this.convertNameToDescription(cleaned);
            this.itemHandleChange('manifest.description', description);
        }
    };

    onChangeDescription = (key: string, description: string, parentInfo: FormParentInfo = {}): void => {
        let autoDescription = false;
        const name = this.state.values['manifest.name'] as string;
        if (description === this.convertNameToDescription(name)) autoDescription = true;

        this.setState({ autoDescription }, () => {
            this.itemHandleChange(key, description, parentInfo);
        });
    };

    shouldShowComponent(showRules: FilterObject, formValues: Record<string, unknown>): boolean {
        if (!showRules) return true;
        return evaluateCondition(showRules, formValues);
    }

    getStandartComponent(item: FormFieldItem, node: NormalizedNode): React.ReactNode {
        const fieldValue = (this.state.values as Record<string, string>)[item.name] ?? '';
        const itemData = item as unknown as FormComponentProps['data'];
        const itemOnChange = this.itemHandleChange as unknown as FormComponentProps['onChange'];

        switch (item.type) {
            case 'LIST':
                return (
                    <FormList
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'STRING':
                return (
                    <FormString
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                        readOnly={item.readOnly}
                        required={item.required}
                        type={item.valueType}
                    />
                );
            case 'INTEGER':
                return (
                    <FormInteger
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'REAL':
                return (
                    <FormReal
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                        readOnly={item.readOnly}
                    />
                );
            case 'BOOL':
                return (
                    <FormBool
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'DATE':
                return (
                    <FormDate
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'DATETIME':
                return (
                    <FormDateTime
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'TEXT':
                return (
                    <FormText
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'JSON':
                return (
                    <FormJson
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                    />
                );
            case 'REF':
            case 'GREF':
                return (
                    <FormGRef
                        key={item.name}
                        server={this.server}
                        value={fieldValue as FormGRefValue | string}
                        data={item as unknown as FormGRefData}
                        disabled={item.disabled}
                        onChange={
                            itemOnChange as unknown as (
                                name: string,
                                value: {},
                                options: Record<string, FormGRefMetadataLink>,
                            ) => void
                        }
                        node={
                            node as {
                                [K in keyof NormalizedNode]-?: Exclude<NormalizedNode[K], null>;
                            }
                        }
                        onLoadData={this.onLoadData}
                        formValues={this.state.values as FormGRefFormValues}
                        parentInfo={this.state.parentInfo}
                    />
                );
            case 'COMPOSITE':
                return (
                    <FormComposite
                        key={item.name}
                        server={this.server}
                        value={fieldValue}
                        data={itemData}
                        disabled={item.disabled}
                        onChange={itemOnChange}
                        node={node}
                    />
                );
            case 'COLOR':
                return (
                    <FormColorPicker
                        key={item.name}
                        data={item as unknown as FormColorPickerData}
                        value={typeof fieldValue === 'string' ? fieldValue : null}
                        disabled={item.disabled}
                        onChange={itemOnChange as unknown as FormColorPickerOnChange}
                    />
                );
            default:
                return '';
        }
    }

    applyRestrictionsToField(item: FormFieldItem, valuesUpToNow: Record<string, unknown>): FormFieldItem | null {
        if (!item.restrictions?.rules) return item;

        const fieldNames = extractFieldNames(item.restrictions!.rules);
        if (fieldNames.length > 0) {
            const hasAllFields = fieldNames.every((fieldName) => fieldName in valuesUpToNow);
            if (!hasAllFields) {
                console.warn(
                    `Ограничения поля "${item.name}" не будут применены: условие ссылается на поле "${fieldNames.find(
                        (f) => !(f in valuesUpToNow),
                    )}", которое находится ниже (после) текущего поля.`,
                );
                return item;
            }
        }

        const shouldShow = this.shouldShowComponent(item.restrictions.rules, valuesUpToNow);

        if (shouldShow) return item;

        const { mode = 'hide', defaultValue } = item.restrictions;

        if (mode === 'hide') {
            if (defaultValue !== undefined && item.name) {
                valuesUpToNow[item.name] = defaultValue;
            }
            return null;
        }

        if (mode === 'disable') {
            if (item.name) {
                valuesUpToNow[item.name] = (this.state.values as Record<string, any>)[item.name];
            }
            return { ...item, disabled: true } as FormFieldItem;
        }

        return item;
    }

    /**
     * Рекурсивно получает компонент формы с учётом restrictions и вложенности
     */
    getFormComponent = (
        item: FormFieldItem | Record<string, any> | unknown[] | null | undefined,
        node: NormalizedNode,
        valuesUpToNow: Record<string, unknown> = {},
    ): any => {
        if (!item) return undefined;

        const restrictedItem = this.applyRestrictionsToField(item as FormFieldItem, valuesUpToNow);
        if (restrictedItem === null) return null;

        if (restrictedItem.component) {
            const CMP = this.props.components?.GetComponent(`Components.${restrictedItem.component}`);
            let props: Record<string, any> = {};
            let children: any[] = [];

            if (CMP) {
                if (restrictedItem.props) {
                    props = this.getFormComponent(restrictedItem.props, node, valuesUpToNow);
                }
                if (restrictedItem.children) {
                    children = this.getFormComponent(restrictedItem.children, node, valuesUpToNow);
                }

                if (props.name) {
                    props.server = this.server;
                    props.value = (this.state.values as Record<string, unknown>)[props.name];
                    props.data = restrictedItem;
                    props.onChange = (data: any) => {
                        this.itemHandleChange(props.name, data);
                    };
                }
                return React.createElement(CMP, props, children);
            }
            return <div>Ошибка рендера компонента {restrictedItem.component}</div>;
        }

        if (restrictedItem.type) {
            valuesUpToNow[restrictedItem.name] = (this.state.values as Record<string, unknown>)[restrictedItem.name];
            return this.getStandartComponent(restrictedItem as FormFieldItem, node);
        }

        if (Array.isArray(restrictedItem)) {
            return restrictedItem.map((val) => this.getFormComponent(val, node, valuesUpToNow));
        }

        if (typeof restrictedItem === 'object') {
            const res: Record<string, any> = {};
            for (const name in restrictedItem) {
                const val = (restrictedItem as unknown as Record<string, unknown>)[name];
                res[name] = this.getFormComponent(val as any, node, valuesUpToNow);
            }
            return res;
        }

        return restrictedItem;
    };

    changeSearchQuery = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            searchQuery: e.target.value,
        });
    };

    clearSearchQuery = (): void => {
        this.setState({
            searchQuery: '',
        });
    };

    filterSearchComponents(
        components: {
            props?: { tabs?: { name: string; content: Record<string, unknown>[] }[] };
            name?: string;
            description?: string;
            [key: string]: unknown;
        }[],
        searchQuery: string,
    ): ((typeof components)[0] | null)[] {
        function matchesSearch(item: { name?: string; description?: string; [key: string]: unknown }): boolean {
            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            const name = (item.name || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            if (!name || !description) return false;
            return name.includes(query) || description.includes(query);
        }

        return components
            .map((component) => {
                if (component.props?.tabs) {
                    const tabsWithContent = component.props.tabs
                        .map((tab) => {
                            const filteredContent = tab.content.filter((c) => matchesSearch(c));
                            for (let i = 0; i < filteredContent.length; i++) {
                                Object.keys(filteredContent[i]).forEach((key) => {
                                    if (key !== 'name' && key !== 'description' && !filteredContent[i][key]) {
                                        delete filteredContent[i][key];
                                    }
                                });
                            }
                            return { name: tab.name, content: filteredContent };
                        })
                        .filter((tab) => tab.content.length > 0);

                    return tabsWithContent.length ? { ...component, props: { tabs: tabsWithContent } } : null;
                }
                return matchesSearch(component) ? component : null;
            })
            .filter(Boolean);
    }

    /**
     * Собирает карту всех полей из nodeForm
     */
    collectFieldsFromNodeForm(node: unknown, fieldsMap: Record<string, FormFieldItem>): void {
        if (!node || typeof node !== 'object') return;

        if (Array.isArray(node)) {
            for (const item of node) {
                this.collectFieldsFromNodeForm(item, fieldsMap);
            }
            return;
        }

        const n = node as { name?: string; type?: string; component?: string; props?: Record<string, unknown> };
        if (n.name && n.type) {
            fieldsMap[n.name] = n as unknown as FormFieldItem;
        } else if (n.component && n.props && n.props.name) {
            fieldsMap[n.props.name as string] = { ...(n.props as unknown as FormFieldItem), parent: n } as FormFieldItem;
        } else if (n.component && n.props && !n.props.name) {
            fieldsMap[n.name!] = n as unknown as FormFieldItem;
        }

        for (const key in n) {
            if (Object.prototype.hasOwnProperty.call(n, key)) {
                const value = (n as Record<string, unknown>)[key];
                if (value && typeof value === 'object') {
                    this.collectFieldsFromNodeForm(value, fieldsMap);
                }
            }
        }
    }

    render(): React.ReactNode {
        const { nodeForm, node, isParentForm } = this.props;
        const { values } = this.state;
        const { 'manifest.name': name } = values;
        const { 'manifest.description': description } = values;

        if (!this.props.components) {
            return null;
        }

        // Замена tabs на accordion в дизайне
        const changedTabsToAccordion = (nodeForm.form as FormFieldItem[]).map((item) =>
            item.component === 'MetadataUiKit.Tabs' ? { ...item, component: 'Accordion' } : item,
        );

        let newNodeForm: typeof changedTabsToAccordion = changedTabsToAccordion;

        if (this.state.searchQuery) {
            newNodeForm = this.filterSearchComponents(
                newNodeForm as unknown as {
                    props?: { tabs?: { name: string; content: Record<string, unknown>[] }[] };
                    name?: string;
                    description?: string;
                }[],
                this.state.searchQuery,
            ) as unknown as typeof changedTabsToAccordion;
        }

        // Валидация циклических зависимостей
        const allFieldsMap: Record<string, FormFieldItem> = {};
        this.collectFieldsFromNodeForm(newNodeForm, allFieldsMap);

        for (const fieldName in allFieldsMap) {
            const item = allFieldsMap[fieldName];
            if (item.restrictions && item.restrictions.rules) {
                validateNoCyclicDependencies(item.restrictions, fieldName, allFieldsMap);
            }
        }

        const valuesUpToNow: Record<string, unknown> = { ...values };

        const renderedComponents: React.ReactNode[] = [];

        for (const item of newNodeForm as FormFieldItem[]) {
            if (!item) continue;
            if (item.name === 'manifest.name') continue;
            if (item.name === 'manifest.description') continue;

            const rendered = this.getFormComponent(item, node, valuesUpToNow);
            if (rendered !== null && rendered !== undefined) {
                renderedComponents.push(rendered);
            }
        }

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('FormBuilderMetadata'),
                }}
            >
                <Input
                    value={this.state.searchQuery}
                    placeholder="Поиск"
                    leftIcon={SearchIcon}
                    rightIcon={this.state.searchQuery ? ClearIcon : undefined}
                    rounded
                    style={{ marginBlock: 8 }}
                    onChange={this.changeSearchQuery}
                    onClickRightIcon={this.clearSearchQuery}
                />
                <FormString
                    key="manifest.name"
                    name="manifest.name"
                    server={this.server}
                    value={name}
                    data={{ name: 'manifest.name', description: 'Наименование объекта' }}
                    onChange={
                        this.onChangeName as (key: string, value: string, parentInfo: FormParentInfo) => void as FormOnChange
                    }
                    readOnly={isParentForm}
                />
                <FormString
                    key="manifest.description"
                    name="manifest.description"
                    server={this.server}
                    value={description}
                    data={{ name: 'manifest.description', description: 'Описание объекта' }}
                    onChange={
                        this.onChangeDescription as (
                            key: string,
                            value: string,
                            parentInfo: FormParentInfo,
                        ) => void as FormOnChange
                    }
                    readOnly={isParentForm}
                />

                {renderedComponents.length > 0 && renderedComponents}
            </ErrorBoundary>
        );
    }
}
