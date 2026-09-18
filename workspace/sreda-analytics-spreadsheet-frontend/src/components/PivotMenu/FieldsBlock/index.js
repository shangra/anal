import cn from 'classnames';
import { ClearIcon, Input, SearchIcon, Tab, Tabs } from 'ui-kit';

import Loader from '../../Loader/Loader';
import { ActiveItem } from '../ActiveItem';
import { SortableContainer, SortableItem } from '../DndComponents/index';
import { GroupBlock } from '../GroupBlock';
import { updateArrayByItemId } from '../helpers/params';
import { calcGroupItems, syncItemStates, updateSearchResults } from './helpers/index';
import styles from './styles.module.css';

export class FieldsBlock extends Loader {
    constructor(props) {
        super(props);
        this.state = {
            search: '',
            activeTabIndex: 0,
            openGroups: {}, // состояния открытия групп
            openItems: {}, // состояния открытия элементов (isActiveDropdown)
            searchedItems: [],
        };
    }

    updateSearchResults = () => {
        const result = updateSearchResults({
            items: this.props.pivotParams[this.props.type],
            search: this.state.search,
            openItems: this.state.openItems,
            openGroups: this.state.openGroups,
            searchedItems: this.state.searchedItems,
        });

        this.setState({
            searchedItems: result.searchedItems,
            openItems: result.openItems,
            openGroups: result.openGroups,
        });
    };

    // Применяет сохраненные пользовательские состояния открытия ко всем элементам
    applyUserOpenStates = (items) => {
        const { openItems } = this.state;
        let updatedItems = [...items];

        Object.keys(openItems).forEach((itemId) => {
            updatedItems = updateArrayByItemId(updatedItems, itemId, 'isActiveDropdown', openItems[itemId]);
        });

        return updatedItems;
    };

    // Обработчик клика по кнопке раскрытия элемента
    handleDropdown = (itemId) => {
        this.setState((prev) => {
            const newOpenState = !prev.openItems[itemId];

            const updatedSearchedItems = updateArrayByItemId(prev.searchedItems, itemId, 'isActiveDropdown', newOpenState);

            return {
                openItems: {
                    ...prev.openItems,
                    [itemId]: newOpenState,
                },
                searchedItems: updatedSearchedItems,
            };
        });
    };

    componentDidUpdate(prevProps, prevState) {
        const searchChanged = prevState.search !== this.state.search;
        const paramsChanged =
            JSON.stringify(prevProps.pivotParams[this.props.type]) !== JSON.stringify(this.props.pivotParams[this.props.type]);

        // при активном поиске и изменении параметров - не обновляем всё
        if (paramsChanged && this.state.search && this.state.search.trim() !== '') {
            // Обновляем только isSelected,isUsed у текущих searchedItems
            const updatedItems = syncItemStates(this.state.searchedItems, this.props.pivotParams[this.props.type]);
            this.setState({ searchedItems: updatedItems });

            return;
        }

        if (searchChanged || paramsChanged) {
            this.updateSearchResults();
        }
    }

    handleTabChange = (index) => {
        this.setState(
            {
                activeTabIndex: index,
                openGroups: {},
                openItems: {},
            },
            () => {
                // После смены таба пересчитываем результаты поиска для нового таба
                if (this.state.search) {
                    this.updateSearchResults();
                }
            },
        );
    };

    toggleGroup = (groupId) => {
        this.setState((prev) => ({
            openGroups: {
                ...prev.openGroups,
                [groupId]: !prev.openGroups[groupId],
            },
        }));
    };

    handleSearchChange = (e) => {
        const newSearch = e.target.value;

        // Если поиск очищается, сбрасываем состояния
        if (newSearch === '' && this.state.search !== '') {
            this.setState({
                search: newSearch,
                openItems: {},
                openGroups: {},
            });
        } else {
            this.setState({ search: newSearch });
        }
    };

    filterByType = (items, typeParam) => items.filter((item) => item.typeParam === typeParam);

    render() {
        const typeParams = [
            { name: 'Measure', description: 'Меры' },
            { name: 'Dimension', description: 'Измерения' },
        ];

        const droppableId = `${this.props.type}_${this.props.uuid}`;

        const { search, searchedItems } = this.state;

        const isSearchActive = search && search.trim() !== '';

        return (
            <div className={cn(this.props.className, styles.container)}>
                <Tabs
                    value={this.state.activeTabIndex}
                    onChange={this.handleTabChange}
                    className={styles.tabs}
                    rightElement={
                        <Input
                            name="metadata-tree-search"
                            fullWidth
                            rounded
                            variant="contained"
                            onChange={this.handleSearchChange}
                            value={search}
                            placeholder="Поиск"
                            leftIcon={SearchIcon}
                            rightIcon={isSearchActive && ClearIcon}
                            onClickRightIcon={() => {
                                this.setState({
                                    search: '',
                                    openItems: {},
                                    openGroups: {},
                                });
                            }}
                        />
                    }
                    variant="rounded"
                    collapsible={false}
                >
                    {typeParams.map((typeParam) => (
                        <Tab key={typeParam.name} label={typeParam.description}>
                            {(() => {
                                const itemsByType = this.filterByType(searchedItems, typeParam.name);
                                const { groups, regularItems } = calcGroupItems(itemsByType);

                                const allItemsForContainer = [...Object.values(groups).flat(), ...regularItems];

                                return (
                                    <SortableContainer
                                        id={droppableId + typeParam.name}
                                        className={styles.sortable}
                                        type={this.props.type}
                                        items={allItemsForContainer}
                                    >
                                        <div className={styles.container__content}>
                                            {!allItemsForContainer.length && (
                                                <div style={{ padding: 'var(--ui-kit-spacing-8)', opacity: 0.7 }}>
                                                    В кубе нет {typeParam.description.toLowerCase()}
                                                </div>
                                            )}
                                            {/* Группы */}
                                            {Object.entries(groups).map(([groupId, groupItems]) => (
                                                <div key={groupId}>
                                                    <GroupBlock
                                                        groupId={groupId}
                                                        isOpen={this.state.openGroups[groupId] || false}
                                                        onToggle={() => this.toggleGroup(groupId)}
                                                    />
                                                    {this.state.openGroups[groupId] &&
                                                        groupItems.map((item) => (
                                                            <SortableItem
                                                                className={styles.sortable__item}
                                                                uuid={this.props.uuid}
                                                                key={`${this.props.type}_${item.id}`}
                                                                id={`${this.props.type}_${item.id}`}
                                                                sourceBlock={this.props.type}
                                                                elementData={item}
                                                            >
                                                                {(isDragging) => (
                                                                    <ActiveItem
                                                                        blockType={this.props.type}
                                                                        uuid={this.props.uuid}
                                                                        item={item}
                                                                        pivotParams={this.props.pivotParams}
                                                                        setPivotParams={this.props.setPivotParams}
                                                                        isDragging={isDragging}
                                                                        hasCheck
                                                                        onSelect={this.props.onSelectItem}
                                                                        onToggleDropdown={this.handleDropdown}
                                                                        isSearchActive={isSearchActive}
                                                                        level={1}
                                                                    />
                                                                )}
                                                            </SortableItem>
                                                        ))}
                                                </div>
                                            ))}

                                            {/* Обычные items */}
                                            {regularItems.map((item) => (
                                                <SortableItem
                                                    className={styles.sortable__item}
                                                    uuid={this.props.uuid}
                                                    key={`${this.props.type}_${item.id}`}
                                                    id={`${this.props.type}_${item.id}`}
                                                    sourceBlock={this.props.type}
                                                    elementData={item}
                                                >
                                                    {(isDragging) => (
                                                        <ActiveItem
                                                            blockType={this.props.type}
                                                            uuid={this.props.uuid}
                                                            item={item}
                                                            pivotParams={this.props.pivotParams}
                                                            setPivotParams={this.props.setPivotParams}
                                                            isDragging={isDragging}
                                                            hasCheck
                                                            onSelect={this.props.onSelectItem}
                                                            onToggleDropdown={this.handleDropdown}
                                                            isSearchActive={isSearchActive}
                                                        />
                                                    )}
                                                </SortableItem>
                                            ))}
                                        </div>
                                    </SortableContainer>
                                );
                            })()}
                        </Tab>
                    ))}
                </Tabs>
            </div>
        );
    }
}
