import React, { type ChangeEvent, type KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CommonInput } from 'components/CommonInput';
import type { UUIDType } from 'components/Metadata/MetadataAPI/types';
import { Popover } from 'components/MetadataForms/Inputs/Ref/components/Popover';
import { List } from 'components/MetadataForms/Inputs/Ref/components/List';
import { HierarchyList, type HierarchyListItemType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/HierarchyList';
import style from './SeachSelect.module.css';
import { type ISelectInfinityListRequiredProps, type SelectInfinityListPropsType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/SelectInfinityList';
import type { SelectInfinityListItemType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/SelectInfinityList/types';
import type { DefaultSelectOptionalPropsType, DefaultSelectRequiredPropsType } from 'components/MetadataForms/Inputs/Ref/components/SearchSelect/types';
import { restoreCursorPosition } from 'components/MetadataForms/Inputs/utils';

const DEFAULT_RESPONSE_ITEMS_LIMIT = 50;

interface ISearchSelectRequiredProps extends Omit<DefaultSelectRequiredPropsType<string>, 'onChange' | 'value'> {
    loadMoreCallback: ISelectInfinityListRequiredProps['loadMoreCallback'];
    onSelectOption: SelectInfinityListPropsType['onSelectOption'];
    value: SelectInfinityListItemType<string, string | null>;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface ISearchSelectOptionalProps extends Omit<DefaultSelectOptionalPropsType, "onSelect" | "value"> {
    debounceDelay?: number
    limit?: number
    offset?: number
    changeButton?: boolean
    openButton?: boolean
    hierarchy?: boolean
    onClear?: () => void
    onSearchTextClear?: () => void
    onClickChange?: () => void
    onClickOpen?: () => void
    clearOptions?: () => void
}

export type SearchSelectPropsType = Readonly<ISearchSelectRequiredProps & ISearchSelectOptionalProps>;

interface SearchSelectStateType {
    searchTextValue: string | null;
    isSearchModeActivated: boolean;
    infinityListFocusedByKeyboard: boolean;
    isInfinityListLoading: boolean;
    foundItems: SelectInfinityListItemType[];
    page: number;
    count: number | null;
    offset: number;
}

export class SearchSelect extends React.Component<SearchSelectPropsType, SearchSelectStateType> {
    static defaultProps: ISearchSelectOptionalProps = {
        limit: 15,
    };

    refToSelect = React.createRef<HTMLInputElement>();

    refToArrowDown = React.createRef<HTMLButtonElement>();

    searchInputRef = React.createRef<HTMLInputElement>();

    readonlyInputId = uuidv4();

    constructor(props: SearchSelectPropsType) {
        super(props);

        this.state = {
            searchTextValue: null,
            isSearchModeActivated: false,
            infinityListFocusedByKeyboard: false,
            isInfinityListLoading: false,
            foundItems: [],
            page: 0,
            count: null,
            offset: 0,
        };
    }

    componentDidUpdate(prevProps: Readonly<SearchSelectPropsType>, prevState: Readonly<SearchSelectStateType>) {
        if (prevState.searchTextValue !== this.state.searchTextValue) {
            this.setState({ foundItems: [], page: 0, offset: 0, count: null }, () => this.loadMoreItems());
            return;
        }

        if (
            prevState.infinityListFocusedByKeyboard !== this.state.infinityListFocusedByKeyboard &&
            !this.state.infinityListFocusedByKeyboard
        ) {
            this.searchInputRef.current?.focus();
        }

        if (this.props.clearOptions && this.state.isSearchModeActivated !== prevState.isSearchModeActivated) {
            this.props.clearOptions();
        }

        if (prevState.isSearchModeActivated !== this.state.isSearchModeActivated && this.state.isSearchModeActivated) {
            if (this.state.foundItems.length === 0 && !this.state.isInfinityListLoading) {
                this.loadMoreItems();
            }
        }
    }

    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        this.setState({ searchTextValue: newValue, isSearchModeActivated: true });
    };

    switchSearchMode = (e: React.MouseEvent) => {
        e.stopPropagation();

        this.setState((prevState) => ({
            isSearchModeActivated: !prevState.isSearchModeActivated,
            searchTextValue: null,
        }));
    };

    turnOffSearchMode = () => {
        this.setState({ isSearchModeActivated: false });
    };

    // Очистка Ref Input
    clearInput = () => {
        // Производим "выбор" пустого элемента
        this.props.onSelectOption({ value: null, label: '' });
        this.props.onClear?.();
    };

    // Очистка введенной строки в поле "поиск"
    // clearSearchText = () => {
    //     this.setState({ searchTextValue: '' });
    //     this.props.onSearchTextClear?.();
    // };

    onReadonlyInputKeyDown = (e: React.KeyboardEvent<any>) => {
        if (e.key === 'ArrowDown') {
            this.refToArrowDown.current?.click();
            e.stopPropagation();
        }

        if (e.key === 'Enter') {
            this.props.onKeyDown(e);
        }
    };

    onInfinityListOptionSelect = (
        selectedOption: SelectInfinityListItemType<string | null>,
        keyboardEvent?: React.KeyboardEvent<any>,
    ) => {
        // Закрываем выпадающий список
        this.turnOffSearchMode();
        // Выполняем select выбранного элемента
        this.props.onSelectOption(selectedOption);

        // Если это был Keyboard Event (Enter) - останавливаем событие
        // чтобы избежать переключения дефолтной рамки RDG
        keyboardEvent?.stopPropagation();

        // Устанавливаем фокус на изначальный инпут
        // чтобы была возможность продолжить работу с реф инпутом
        document.getElementById(this.readonlyInputId)?.focus();
        // Делаем reset статуса infinityList
        this.setState({ infinityListFocusedByKeyboard: false, searchTextValue: null });
    };

    onInfinityListOptionKeyDown = (
        e: React.KeyboardEvent<HTMLOptionElement>,
        infinityListItems: SelectInfinityListItemType[],
        itemIdx: number,
        optionsGeneratedIdsArr: UUIDType[]
    ) => {
        let directionSign: '+' | '-' = '+';

        //  Определяем направление движения по списку и останавливаем событие
        //  чтобы не произошло движение дефолтной рамки RDG
        //  "+" - к концу списка
        //  "-" - к началу списка
        //  В случае если нажат Enter - выбираем элемент по которому нажат Enter
        switch (e.key) {
            case 'ArrowDown':
                directionSign = '+';
                break;
            case 'Tab':
                directionSign = '+';
                if (e.shiftKey) {
                    directionSign = '-';
                }
                break;
            case 'ArrowUp':
                directionSign = '-';
                break;
            case 'Enter':
                this.onInfinityListOptionSelect(infinityListItems[itemIdx], e);
                e.stopPropagation();
                return;
            default:
                return;
        }

        // Чтобы избежать скролла
        if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
        }

        e.stopPropagation();

        // В случае если это первый элемент и нажаты Shift+Tab или стрелка вверх
        // то фокус переходит на SearchInput
        if (itemIdx === 0 && directionSign === '-') {
            e.preventDefault();
            this.searchInputRef.current?.focus();
            this.setState({ infinityListFocusedByKeyboard: false });
        }

        // Tab и Shift+Tab по умолчанию сами передвигают фокус и искусственно это делать не нужно
        if (e.key === 'Tab') {
            return;
        }

        // В случае если:
        // 1) это не первый и не последний элемент списка
        // или
        // 2) это первый элемент списка и движение происходит к конца списка
        // или
        // 3) это последний элемент списка и движение происходит к началу списка
        if (
            (itemIdx < infinityListItems.length - 1 && itemIdx > 0) ||
            (itemIdx === 0 && directionSign === '+') ||
            (itemIdx === infinityListItems.length - 1 && directionSign === '-')
        ) {
            const nextElementId = optionsGeneratedIdsArr[itemIdx + Number(`${directionSign}1`)];
            document.getElementById(nextElementId)?.focus();
        }
    };

    getCachedOrFilteredItems = (): SelectInfinityListItemType[] => {
        const { searchTextValue } = this.state;
        const search = searchTextValue?.toLowerCase() || '';

        return this.state.foundItems.filter((item) => item.label.toLowerCase().includes(search));
    };

    loadMoreItems = () => {
        if (this.state.isInfinityListLoading) return;

        const shouldLoad = this.state.count === null || this.state.offset < this.state.count;
        
        if (!shouldLoad) return;

        this.setState({ isInfinityListLoading: true });

        const options = {
            limit: this.props.limit || 15,
            offset: this.state.offset,
        };

        this.props
            .loadMoreCallback(options, this.state.searchTextValue || '', true)
            .then((data) => {
                if (!data?.rows?.length) {
                    this.setState({ isInfinityListLoading: false });
                    return;
                }

                this.setState((prev) => ({
                    foundItems: [...prev.foundItems, ...data.rows],
                    count: data.count,
                    page: prev.page + 1,
                    offset: (prev.page + 1) * (this.props.limit || 15),
                    isInfinityListLoading: false,
                }));
            })
            .catch(() => {
                this.setState({ isInfinityListLoading: false });
            });
    };

    handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 5 && !this.state.isInfinityListLoading) {
            this.loadMoreItems();
        }
    };

    convertItemsForHierarchyList = (items: SelectInfinityListItemType[]): HierarchyListItemType[] =>
        items.map((item) => ({
            title: item.label,
            value: item.value,
            needToLoading: true,
            isLoading: false,
            children: [],
        }));

    render() {
        const {
            limit,
            offset,
            name,
            value,
            placeholder,
            debounceDelay,
            width,
            fullWidth,
            changeButton = false,
            onClickOpen,
            openButton,
            readOnly,
            onDoubleClick,
        } = this.props;

        return (
            <div className={style.searchSelect} style={{ width }}>
                <div className={style.selectedItemPanel}>
                    <CommonInput
                        type="select"
                        name={name}
                        ref={this.refToSelect}
                        readonly={readOnly}
                        fullWidth={fullWidth}
                        value={this.state.searchTextValue ?? value?.label ?? ''}
                        placeholder={placeholder ?? ''}
                        aria-label={placeholder ?? 'Ссылка'}
                        selectButton={!readOnly}
                        changeButton={changeButton && !readOnly}
                        openButton={openButton && !readOnly}
                        deleteButton={!readOnly}
                        onClickSelect={this.switchSearchMode}
                        onClickDelete={this.clearInput}
                        onClickOpen={onClickOpen}
                        onKeyDown={this.onReadonlyInputKeyDown}
                        onChange={this.onChange}
                        onDoubleClick={onDoubleClick}
                    />
                </div>

                <Popover
                    opened={this.state.isSearchModeActivated}
                    onOpened={(newVal) => this.setState({ isSearchModeActivated: newVal })}
                    content={
                        <div className={style.selectDropdownPart}>
                            {this.props.hierarchy === true ? (
                                <HierarchyList
                                    // @ts-expect-error
                                    // TODO костыль, сейчас дерево не поддерживает lazy подгрузку
                                    limit={undefined}
                                    offset={offset}
                                    // limit={limit || DEFAULT_RESPONSE_ITEMS_LIMIT}
                                    searchText={this.state.searchTextValue || ''}
                                    toHierarchyListConverter={this.convertItemsForHierarchyList}
                                    getItemKey={(item) => item.title + item.value}
                                    loadMoreCallback={this.props.loadMoreCallback}
                                    listClassName={style.selectListView}
                                    onSelectOption={(selectedOption: HierarchyListItemType) => {
                                        this.onInfinityListOptionSelect({
                                            value: selectedOption.value,
                                            label: selectedOption.title,
                                        });
                                    }}
                                />
                            ) : (
                                <div
                                    className={style.selectDropdownPart}
                                    style={{ maxHeight: 300, overflowY: 'auto' }}
                                    onScroll={(e) => this.handleScroll(e)}
                                >
                                    <List
                                        testId="search-select-list"
                                        className={style.selectListView}
                                        options={this.getCachedOrFilteredItems()}
                                        value={this.props.value?.value ? [this.props.value.value] : []}
                                        type="single"
                                        resettable
                                        loading={this.state.isInfinityListLoading}
                                        onChange={(_, option) => {
                                            const item = this.getCachedOrFilteredItems().find((i) => i.value === option.value);
                                            if (item) {
                                                this.onInfinityListOptionSelect({
                                                    value: item.value,
                                                    label: item.label,
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    }
                    // refToChildren={this.refToSelect}
                />
            </div>
        );
    }
}
