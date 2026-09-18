import cn from 'classnames';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { v4 as uuidv4 } from 'uuid';
import { Timer } from 'helpers/timer';
import type { IMetadataForTable, MetadataSearchOptionsType, UUIDType } from 'components/Metadata/MetadataAPI/types';
import type { DefaultSelectOptionalPropsType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/types';
import style from './SelectInfinityList.module.css';
import type { SelectInfinityListItemType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/SelectInfinityList/types';
import { Loader } from 'ui-kit';

export interface ISelectInfinityListRequiredProps {
    onSelectOption: (selectedOption: SelectInfinityListItemType<string | null>, keyboardEvent?: React.KeyboardEvent<any>) => void;
    loadMoreCallback: (
        options: MetadataSearchOptionsType,
        searchText: string,
        convertToValueLabelFormat?: boolean
    ) => Promise<IMetadataForTable<SelectInfinityListItemType>>;
    searchText: string;
    focusedByKeyboard: boolean;
    setFocusedByKeyboard: (value: boolean) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean, onChangeState?: () => void) => void;
    onKeyDown: (
        e: React.KeyboardEvent<HTMLOptionElement>,
        infinityListItems: SelectInfinityListItemType[],
        itemIdx: number,
        optionsGeneratedIdsArr: UUIDType[]
    ) => void;
    limit: number;
}

export interface ISelectInfinityListOptionalProps extends Omit<DefaultSelectOptionalPropsType, 'onSelect' | 'onKeyDown'> {
    debounceDelay?: number;
    listStyle?: React.CSSProperties;
    optionStyle?: React.CSSProperties;
    optionClassName?: string;
    listClassName?: string;
    autoFocus?: boolean;
    hierarchy?: boolean;
}

export type SelectInfinityListPropsType = Readonly<ISelectInfinityListRequiredProps & ISelectInfinityListOptionalProps>;

interface ISelectInfinityState {
    page: number;
    count: number;
    offset: number;
    foundItems: SelectInfinityListItemType[];
    optionsGeneratedIdsArr: UUIDType[];
    error: boolean;
}

export class SelectInfinityList extends React.Component<SelectInfinityListPropsType, ISelectInfinityState> {
    static defaultProps: ISelectInfinityListOptionalProps = {
        debounceDelay: 800,
    };

    lastRequestId: string = '';

    private debounceTimer: Timer | null = null;

    constructor(props: SelectInfinityListPropsType) {
        super(props);

        this.debounceTimer = new Timer(this.props.debounceDelay);

        this.state = {
            count: 9999999999,
            page: 0,
            offset: 0,
            foundItems: [],
            optionsGeneratedIdsArr: [],
            error: false,
        };
    }

    private loadMore = async (hierarchy?: boolean) => {
        if (this.props.isLoading) {
            return Promise.resolve([]);
        }

        const currentRequestId = uuidv4();
        this.lastRequestId = currentRequestId;

        const options: MetadataSearchOptionsType = {
            limit: this.props.limit,
            offset: this.state.offset,
        };

        if (hierarchy) {
            options.hierarchy = true;
        }

        // Обнуляем предыдущую ошибку
        this.setState({ error: false });
        const promise = this.props.loadMoreCallback(options, this.props.searchText, true);
        this.props.setIsLoading(true);

        promise
            .then((data) => {
                const { rows: newFoundItems, count } = data;

                // В случае если это не последний запрос - возвращаем пустой ответ
                // Чтобы отобразился результат только последнего запроса
                if (this.lastRequestId !== currentRequestId) {
                    return Promise.resolve([]);
                }

                this.props.setIsLoading(false);

                const page = this.state.page + 1;

                this.setState((prevState) => {
                    const foundItems = [...prevState.foundItems, ...newFoundItems];

                    return {
                        foundItems,
                        optionsGeneratedIdsArr: foundItems?.map(() => uuidv4()) || [],
                        count,
                        page,
                        offset: page * this.props.limit,
                    };
                });
            })
            .catch((e) => {
                // В случае если это не последний запрос - не отображаем ошибку
                // Так как нам важен результат только последнего запроса
                if (this.lastRequestId !== currentRequestId) {
                    return;
                }

                console.error(e);
                this.setState({ error: true });
            });
    };

    private useDebouncing = (callback: () => void) => {
        this.debounceTimer?.start(callback);
    };

    componentDidUpdate(prevProps: Readonly<SelectInfinityListPropsType>, prevState: Readonly<any>) {
        if (prevProps.searchText !== this.props.searchText) {
            this.setState({ offset: 0, foundItems: [], page: 1 }, () => {
                this.props.setIsLoading(false, () => this.useDebouncing(this.loadMore));
            });
        }

        // Обработка фокусировки с клавиатуры (через стрелку)
        // для переключения фокуса с инпута на опции выпадающего списка
        if (prevProps.focusedByKeyboard !== this.props.focusedByKeyboard && this.props.focusedByKeyboard) {
            document.getElementById(this.state.optionsGeneratedIdsArr[0])?.focus();
        }
    }

    componentWillUnmount() {
        this.debounceTimer?.stop();
    }

    render() {
        const hasMore = this.state.count > this.state.page * this.props.limit;

        return (
            <div
                id='select-infinity-list'
                className={cn(style.selectInfinityList, this.props.listClassName, {
                    [style.selectInfinityList_border]: this.state.foundItems.length > 0,
                    [style.selectInfinityList_notHierarchy]: !this.props.hierarchy,
                })}
                style={this.props.listStyle}
            >
                <InfiniteScroll
                    pageStart={0}
                    initialLoad
                    loadMore={(_: number) => this.useDebouncing(this.loadMore)}
                    hasMore={hasMore}
                    useWindow={false}
                    threshold={500}
                    element='div'
                >
                    {!this.state.error &&
                        this.state.foundItems.map((item, idx) => (
                            <option
                                id={this.state.optionsGeneratedIdsArr[idx]}
                                tabIndex={0}
                                onKeyDown={(e) => this.props.onKeyDown(e, this.state.foundItems, idx, this.state.optionsGeneratedIdsArr)}
                                key={item.value + item.label}
                                className={cn(style.option, this.props.optionClassName)}
                                style={this.props.optionStyle}
                                onClick={() => this.props.onSelectOption(item)}
                            >
                                {item.label}
                            </option>
                        ))}
                    {!this.state.error && this.props.isLoading && <Loader />}
                    {this.state.error && <div className={style.error}>Ошибка загрузки</div>}
                </InfiniteScroll>
            </div>
        );
    }
}
