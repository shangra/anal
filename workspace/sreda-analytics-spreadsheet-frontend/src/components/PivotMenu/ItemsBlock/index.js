import cn from 'classnames';
import React from 'react';
import { IconButton, PlusIcon, Typography } from 'ui-kit';

import Loader from '../../Loader/Loader';
import { ActiveItem } from '../ActiveItem';
import { SortableContainer, SortableItem } from '../DndComponents/index';
import { addSelectedItemsToBlockValid, delItemFromBlock, moveItemInBlock, reverseItemIdValue } from '../helpers/params';
import styles from './styles.module.css';

export class ItemsBlock extends Loader {
    handleDropdown = (itemId, blockType) => {
        // reverseItemIdValue - поиск и инвертирование boolean значения элемента в дереве по его ID и TYPE
        // blockType - тип fields/columns/rows/values/filter
        const tempArray = reverseItemIdValue(this.props.pivotParams?.[blockType], itemId, 'isActiveDropdown');
        // pivotParams - стейт с элементами меню MetadataPivotMenu
        // setPivotParams - сеттер стейта в MetadataPivotMenu
        if (this.props.setPivotParams)
            this.props.setPivotParams({
                ...this.props.pivotParams,
                [this.props.blockType]: tempArray,
            });
    };

    hasSelectedFields = (items) => {
        if (!Array.isArray(items)) return false;
        return items.some((item) => item?.isSelected || this.hasSelectedFields(item?.child));
    };

    handleAddSelectedItemsToArray = () => {
        const fields = this.props.pivotParams?.fields || [];
        if (!this.hasSelectedFields(fields)) {
            this.props.onEmptyAdd?.(this.props.type);
            return;
        }
        addSelectedItemsToBlockValid(this.props.type, this.props.pivotParams, this.props.setPivotParams);
    };

    handleMoveUp = (itemId, blockType) => {
        if (this.props.setPivotParams) {
            const newItems = moveItemInBlock(this.props.pivotParams[blockType], itemId, 'up');
            this.props.setPivotParams({
                ...this.props.pivotParams,
                [blockType]: newItems,
            });
        }
    };

    handleMoveDown = (itemId, blockType) => {
        if (this.props.setPivotParams) {
            const newItems = moveItemInBlock(this.props.pivotParams[blockType], itemId, 'down');
            this.props.setPivotParams({
                ...this.props.pivotParams,
                [blockType]: newItems,
            });
        }
    };

    handleDelete = (itemId, blockType) => {
        // удаление выбранного элемента из элементов меню
        // blockType тип fields/columns/rows/values/filter
        // pivotParams - стейт с элементами меню в MetadataPivotMenu
        // setPivotParams - сеттер стейта в MetadataPivotMenu
        delItemFromBlock(blockType, itemId, this.props.pivotParams, this.props.setPivotParams);
    };

    // Функция для проверки, нужно ли показывать плейсхолдер на позиции
    shouldShowPlaceholder = (index) => {
        const { preview, type } = this.props;

        if (!preview || preview.container !== type) return false;

        // Если индекс соответствует позиции вставки
        return preview.index === index;
    };

    emptyHint = () => {
        switch (this.props.type) {
            case 'rows':
                return 'Вкладка «Измерения» слева → отметьте поле → «+» здесь. Меры в строки не ставятся.';
            case 'columns':
                return 'Вкладка «Измерения» слева → отметьте поле → «+» здесь. Меры в столбцы не ставятся.';
            case 'filter':
                return 'Вкладка «Измерения» слева → отметьте поле → «+» здесь.';
            case 'values':
                return 'Вкладка «Меры» слева → отметьте меру → «+» здесь.';
            case 'layers':
                return 'Слои приходят из инфосервисов куба. Если список пуст — слой нужно завести в админке.';
            default:
                return 'Отметьте поле слева и нажмите «+».';
        }
    };

    plusTitle = () => {
        switch (this.props.type) {
            case 'rows':
                return 'Добавить выбранное измерение в строки';
            case 'columns':
                return 'Добавить выбранное измерение в столбцы';
            case 'filter':
                return 'Добавить выбранное измерение в фильтр';
            case 'values':
                return 'Добавить выбранную меру в значения';
            default:
                return 'Добавить выбранные поля';
        }
    };

    render() {
        const items = this.props.pivotParams[this.props.type] || [];
        const hasAppend = this.props.hasAppend === undefined ? true : this.props.hasAppend;

        return (
            <div className={cn(this.props.className, styles.container)}>
                <div className={styles.header}>
                    <div className={`${styles.header_title}`}>
                        {this.props.icon}
                        <Typography variant="heading5" style={{ fontWeight: 600 }}>
                            {this.props.title}
                        </Typography>
                        {this.props.actions}
                    </div>
                    {hasAppend && (
                        <IconButton
                            icon={PlusIcon}
                            size="small"
                            color="primary"
                            variant="text"
                            onClick={this.handleAddSelectedItemsToArray}
                            title={this.plusTitle()}
                        />
                    )}
                </div>
                <SortableContainer
                    id={`${this.props.type}_${this.props.uuid}`}
                    className={styles.sortable}
                    type={this.props.type}
                    items={items}
                >
                    <div className={styles.container__content}>
                        {items.length === 0 && <div className={styles.emptyHint}>{this.emptyHint()}</div>}
                        {/* Плейсхолдер в начале */}
                        {this.shouldShowPlaceholder(0) && <div className={styles.preview__placeholder} />}

                        {items &&
                            items.map((item, idx) => (
                                <React.Fragment key={`${this.props.type}_${item.id}`}>
                                    <SortableItem
                                        className={styles.sortable__item}
                                        uuid={this.props.uuid}
                                        id={`${this.props.type}_${item.id}`}
                                        sourceBlock={this.props.type}
                                        elementData={item}
                                    >
                                        {(isChildDragging) => (
                                            <ActiveItem
                                                key={item.id}
                                                blockType={this.props.type}
                                                uuid={this.props.uuid}
                                                item={item}
                                                hasActions
                                                isDragging={isChildDragging}
                                                sortable
                                                hasCheck={this.props.hasCheck}
                                                pivotParams={this.props.pivotParams}
                                                setPivotParams={this.props.setPivotParams}
                                                onSelect={this.props.onSelectItem}
                                                onToggleDropdown={this.handleDropdown}
                                                onMoveUp={this.handleMoveUp}
                                                onMoveDown={this.handleMoveDown}
                                                onDelete={this.handleDelete}
                                            />
                                        )}
                                    </SortableItem>

                                    {/* Плейсхолдер после каждого элемента */}
                                    {this.shouldShowPlaceholder(idx + 1) && <div className={styles.preview__placeholder} />}
                                </React.Fragment>
                            ))}
                    </div>
                </SortableContainer>
            </div>
        );
    }
}
