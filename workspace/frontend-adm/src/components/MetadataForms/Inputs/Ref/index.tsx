import cn from 'classnames';
import React, { Component, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import $api from 'helpers/axios';
import type { CommonInputProps } from 'components/CommonInput';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { FormMetadata } from 'components/FormMetadata';
import type { IMetadataForTable, MetadataSearchOptionsType } from 'components/Metadata/MetadataAPI/types';
import $windows from 'components/WindowsCMP/windows.helper';
import type { ApiManager } from 'components/MetadataForms/DataManager/ApiManager';
import style from '../style.module.css';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';
import { SearchSelect, type SearchSelectPropsType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect';
import type { SelectInfinityListItemType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/SelectInfinityList/types';
import { replaceTemplate } from 'components/MetadataForms/Inputs/Ref/utils';
import DataManager, { type MetaRefs } from 'components/MetadataForms/DataManager';
import { FIELD_TYPE_TO_OPERATORS } from 'components/DRQueryBuilder/components/Rule';
import { MetaField, QueryBuilderRuleCommonOperationEnum } from 'components/DRQueryBuilder/types';
import { buildUrl } from 'helpers/buildUrl';

export type RefType = { link: string | null; value: string | null };

export interface IRefInputRequiredProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    metaRef: RefType; // Ref, по которому будет производиться поиск
    value: SelectInfinityListItemType<string | null, string | null>; // Объект значения вида {value: '', label: ''}
    refSearchFields?: string[]; // [[fieldName]] ([[description]])
    labelMask?: string;
    onChange: (selectedOption: IRefInputRequiredProps['value'], keyboardEvent?: React.KeyboardEvent<any> | undefined) => void;
}

type FetchOptionType = Record<any, any>;

interface IOnBeforeLoadBody {
    fetchOptions: FetchOptionType;
}

interface IOnBeforeLoadMetadata {
    DataManager: DataManager | null;
}

interface IOnAfterLoadMetadata {
    DataManager: DataManager | null;
}

interface IRefInputOptionalProps {
    DataManager?: DataManager;
    limit?: SearchSelectPropsType['limit'];
    debounceDelay?: SearchSelectPropsType['debounceDelay'];
    hierarchy?: boolean;
    changeButton?: boolean;
    readOnly?: boolean;
    name?: string;
    containerClassName?: string;
    onClear?: SearchSelectPropsType['onClear'];
    onSearchTextClear?: SearchSelectPropsType['onSearchTextClear'];
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onClickChange?: SearchSelectPropsType['onClickChange'];
    onDoubleClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
    onBeforeLoad?: (body: IOnBeforeLoadBody, metadata: IOnBeforeLoadMetadata) => Promise<{ fetchOptions: FetchOptionType }>;
    onAfterLoad?: (result: any, metadata: IOnAfterLoadMetadata) => void;
    /**
     * Сервер, на который идут запросы. Прокидывается сверху из DataManager через MetaInput.
     * '' означает «основной сервер» (default backend). См. SRDMDLTKLN-525.
     */
    server?: string;
}

export type RefInputPropsType = Readonly<IRefInputRequiredProps & IRefInputOptionalProps>;

interface RefInputStateType {
    value: IRefInputRequiredProps['value'];
    isHierarchyInput: boolean;
    searchFields: string[];
    labelMask: string;
    options: ApiManager['options'];
    metadata: ApiManager['metadata'];
}

/**
 * Компонент Ref, построенный на SearchSelect, который использует CommonInput
 */
class RefContent extends React.Component<RefInputPropsType, RefInputStateType> {
    static defaultProps: IRefInputOptionalProps = {
        limit: 30,
    };

    constructor(props: RefInputPropsType) {
        super(props);

        this.state = {
            value: props.value,
            isHierarchyInput: false,
            searchFields: this.props.refSearchFields ?? ['name'],
            labelMask: this.props.labelMask?.replaceAll('\\', '') ?? '',
            options: {
                limit: 200,
            },
            metadata: {}
        };
    }

    componentDidMount() {
       this.getServiceData()
    }

    async getServiceData() {
        const meta = await this.getMetadata()

        let {label} = this.props.value;

        if (this.state.labelMask && this.props.value.value) {
            const apiOptions = {
                ...this.state.options,
                withHierarchy: false,
                withMetadata: false,
                attributes: this.getAttributes(meta),
                where: {
                    id: {
                        $eq: this.props.value.value,
                    },
                },
            };

            const query = encodeURIComponent(JSON.stringify(apiOptions));

            const res = await $api.get(buildUrl(this.props.server, `${meta.routes.toLowerCase()}/${meta.id}?options=${query}`), { data: { flashOff: true } })

            label = replaceTemplate(this.state.labelMask, res.data.rows[0], res.data.refs)
        }

        this.setState(() => ({
            value: {
                value: this.props.value.value,
                label
            }
        }))
    }

    async getMetadata() {
        if (this.props.readOnly || !this.props.metaRef.value) return
        const meta = await $api.get(buildUrl(this.props.server, `metadata/object/${this.props.metaRef.value}`), { data: { flashOff: true } })
        const searchFieldName: string[] = []

        const entries = Object.entries(meta.data.treeObject.Fields)

        entries.forEach((i: [key: string | number | symbol, value: any]) => {
            const name = this.props.refSearchFields?.includes(i[1].name)
            const field = this.props.refSearchFields?.includes(i[1].field)
            if(name || field) {
                searchFieldName.push(i[0] as string)
            }
        })


        this.setState(prevState => ({
            metadata: meta.data,
            // TODO: разобраться с иерархией, должна приходить всегда из одного места
            isHierarchyInput: meta.data?.hierarchy?.on || meta.data?.manifest?.settings?.hierarchy || meta.data?.manifest?.settings?.hierarchical || false,
            searchFields: searchFieldName.length ? [...searchFieldName] : ["name"],
        }))

        return meta.data
    }

    componentDidUpdate(prevProps: Readonly<RefInputPropsType>) {
        if (this.props.value.value !== this.state.value.value && (this.props.value !== undefined)) {
            this.setState({ value: this.props.value });
            this.getServiceData()
        }
        if (prevProps.metaRef.value !== this.props.metaRef.value) {
            this.getMetadata()
        }
    }

    editElement = () => {
        const objectIdRef = this.props.metaRef.value;
        const elementId = this.state.value.value;

        const modalUUID = uuidv4();

        $windows.open(
            'Редактирование элемента',
            <FormMetadata
                id={objectIdRef}
                type='element'
                element={elementId}
                server={this.props.server}
                payload={{
                    modalUUID,
                    parentModalUUID: null,
                }}
                primaryKey="id"
            />,
            {
                uuid: modalUUID,
            }
        );
    };

    onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (this.props.onKeyDown) this.props.onKeyDown(e);
    };

    onSelectOption = (selectedOption: IRefInputRequiredProps['value']) => {
        const value = selectedOption;
        this.setState({ value }, () => this.props.onChange?.(value));
    };

    onInputClear = () => {
        const value = { value: null, label: '' };
        this.setState({ value }, () => this.props?.onClear?.());
    };

    getAttributes(metadata: ApiManager['metadata']) {
        const fields = metadata?.treeObject?.Fields ?? {};
        const attributes = Object.keys(fields).filter((el) => fields[el].show);
        attributes.push('id');
        return attributes.length > 0 ? attributes : undefined;
    }

    loadMoreCallback = async (options: MetadataSearchOptionsType, searchText: string, convertToValueLabelFormat?: boolean) => {
        const fetchOptions = {
            ...this.state.options,
            ...options,
            ...(!options.limit && { limit: 200 }),
            withHierarchy: searchText ? false : this.state.metadata?.hierarchy?.on || this.state.metadata?.manifest?.settings?.hierarchy || this.state.metadata?.manifest?.settings?.hierarchical || false,
            attributes: this.getAttributes(this.state.metadata),
            ...(searchText && {where: {
                "$or": []
            },})
        };        

        if(searchText) {
            this.setState({isHierarchyInput: false})
            
            this.state.searchFields.forEach((field: string) => {
                    const type = this.state.metadata.treeObject.Fields[field].type as MetaField['type']
                    const typeOperators = FIELD_TYPE_TO_OPERATORS[type] ?? []
                    const canSearch = ['$iLike', '$like', '$eq'].some((opt) =>
                        typeOperators.includes(opt as QueryBuilderRuleCommonOperationEnum),
                    )

                    if (!canSearch) {
                        return
                    }

                    fetchOptions.where.$or.push({
                        [field]: { $iLike: `%${searchText}%` },
                    })
                })

        } else {
            this.setState((prevState) => ({isHierarchyInput: prevState.metadata?.hierarchy?.on || prevState.metadata?.manifest?.settings?.hierarchy || prevState.metadata?.manifest?.settings?.hierarchical || false}))
        }
        const { fetchOptions: handledFetchOptions } = await (
            this.props.onBeforeLoad?.({ fetchOptions }, { DataManager: this.props.DataManager ?? null }) ??
            new Promise<{fetchOptions: Record<any, any>}>((resolve) => resolve({ fetchOptions }))
        );
        const query = encodeURIComponent(JSON.stringify(handledFetchOptions));
        const url = buildUrl(this.props.server, `${this.state.metadata.routes.toLowerCase()}/${this.state.metadata.id}?options=${query}`);
        const res = await $api.get(url, { data: { flashOff: true } });
        this.props.onAfterLoad?.(res, { DataManager: this.props.DataManager ?? null });

        return {
            ...res.data,
            // для поиска по иерархичному списку результаты выводятся в плоском виде
            ...(searchText && {
                hierarchy: {}
            }),
            rows: res.data.rows.map((option: Record<string, string>) => {
                const label = this.state.labelMask ? replaceTemplate(this.state.labelMask, option, res.data.refs) : res.data.refs?.id?.[option.id] ?? option.name;

                if ("key" in option && "value" in option) {
                    return {
                        label: option.value,
                        value: option.key,
                    }
                }
                return {
                    label,
                    value: option.id,
                };
            }),
        } as unknown as IMetadataForTable<SelectInfinityListItemType>
    };

    render() {
        const {
            limit = 200,
            name,
            onChange,
            onClear,
            onSearchTextClear,
            debounceDelay,
            changeButton = false,
            ...optionalProps
        } = this.props

        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_Inputs_RefContent'),
                }}
            >
                <div className={cn(style.commonInputWrapper, this.props.containerClassName)}>
                    {this.props.metaRef ? (
                        <SearchSelect
                            {...optionalProps}
                            limit={this.state?.options.limit ?? limit}
                            offset={this.state?.options.offset ?? 0}
                            hierarchy={this.state.isHierarchyInput}
                            debounceDelay={debounceDelay}
                            value={{
                                value: this.state.value?.value ?? '',
                                label: this.state.value?.label ?? '',
                            }}
                            name={name}
                            openButton={!!this.state.value.value}
                            changeButton={changeButton}
                            loadMoreCallback={this.loadMoreCallback}
                            onSelectOption={this.onSelectOption}
                            onClear={this.onInputClear}
                            onSearchTextClear={onSearchTextClear}
                            onClickOpen={this.editElement}
                            onKeyDown={this.onKeyDown}
                            onClickChange={this.props.onClickChange}
                            onDoubleClick={this.props.onDoubleClick}
                            clearOptions={() => {
                                if (this.state?.options)
                                    this.setState({
                                        options: {
                                            limit: 30,
                                            offset: 0,
                                        }
                                    })
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                backgroundColor: '#F4515D',
                                padding: 8,
                                color: '#fff',
                            }}
                        >
                            Для ячейки не настроены метаданные
                        </div>
                    )}
                </div>
            </ErrorBoundary>
        );
    }
}

export class Ref extends Component<RefInputPropsType> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_Ref'),
                }}
            >
                <RefContent {...this.props} />
            </ErrorBoundary>
        );
    }
}