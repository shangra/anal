/* eslint-disable no-nested-ternary */
import cn from 'classnames';
import React, { Component } from 'react';
import { Checkbox, DropDownIcon, DropRightIcon, IconButton, IndicatorDownIcon, IndicatorUpIcon, Loader } from 'ui-kit';

import { DeleteIcon } from '../../UiKitIcons/DeleteIcon';
import { SigmaIcon } from '../../UiKitIcons/SigmaIcon';
import { SortableContainer, SortableItem } from '../DndComponents/index';
import { FilterPivot } from '../FilterPivot';
import { IPivotParams } from '../pivot-menu-types';
import { ILayerNoticeItem } from '../pivot-menu-types/pivot-menu.types';
import { ShiftLevelPivot } from '../ShiftLevelPivot';
import { SortPivot } from '../SortPivot';
import Notice from './Notice';
import styles from './styles.module.css';

interface IProps {
    item: any;
    blockType: string;
    uuid: string;
    level: number;
    hasCheck: string;
    isDragging: string;
    hasActions: boolean;
    sortable: boolean;
    hasShift: boolean;
    pivotParams: IPivotParams;
    setPivotParams: (pivotParams: IPivotParams) => void;
    onToggleDropdown: (id: string, blockType: string) => void;
    onSelect: (id: string, blockType: string, isSelected: boolean, categoryId: string) => void;
    onMoveUp: (id: string, blockType: string) => void;
    onMoveDown: (id: string, blockType: string) => void;
    onDelete: (id: string, blockType: string) => void;
}

export class ActiveItem extends Component<IProps> {
    handleToggleDropdown = (e: React.MouseEvent) => {
        if (this.props.item.disabled) return;
        if (!e.currentTarget.contains(e.target as Element)) return;

        e.stopPropagation();

        if (this.props.onToggleDropdown) {
            this.props.onToggleDropdown(this.props.item.id, this.props.blockType);
        }
    };

    handleSelect = (e: React.MouseEvent | React.ChangeEvent) => {
        if (this.props.item.disabled) return;
        if (!e.currentTarget.contains(e.target as Element)) return;

        e.stopPropagation();

        if (this.props.onSelect) {
            this.props.onSelect(
                this.props.item.id,
                this.props.blockType,
                this.props.item.isSelected,
                this.props.item.categoryId,
            );
        }
    };

    handleMoveUp = (e: React.MouseEvent) => {
        if (this.props.item.disabled) return;
        if (!e.currentTarget.contains(e.target as Element)) return;

        e.stopPropagation();

        if (this.props.onMoveUp) {
            this.props.onMoveUp(this.props.item.id, this.props.blockType);
        }
    };

    handleMoveDown = (e: React.MouseEvent) => {
        if (this.props.item.disabled) return;
        if (!e.currentTarget.contains(e.target as Element)) return;

        e.stopPropagation();

        if (this.props.onMoveDown) {
            this.props.onMoveDown(this.props.item.id, this.props.blockType);
        }
    };

    handleDelete = (e: React.MouseEvent) => {
        if (this.props.item.disabled) return;
        if (!e.currentTarget.contains(e.target as Element)) return;

        e.stopPropagation();

        if (this.props.onDelete) {
            this.props.onDelete(this.props.item.id, this.props.blockType);
        }
    };

    render() {
        const {
            uuid,
            hasCheck = false,
            level = 0,
            isDragging = false,
            sortable = false,
            hasShift = false,
            hasActions = false,
            blockType,
            pivotParams,
            setPivotParams = () => {},
            onMoveUp = () => {},
            onMoveDown = () => {},
            onSelect = () => {},
            onDelete = () => {},
        } = this.props;

        let { item } = this.props;
        item = structuredClone(item);

        // Показываем кнопку сдвига подполя в уровень измерения, только если оно еще не сдвинуто
        // @ts-expect-error
        const isSubDimensionAsDimension = pivotParams?.[blockType]?.some((i) => i.parentId === item.parentId);

        item.hasSorting ??= item.hasSorted;
        item.hasSorting = item.hasSorting === undefined ? hasActions : item.hasSorting;
        item.hasFilter = item.onoffFilter
            ? false
            : !(pivotParams?.isMask && item.isMasked) && item.hasFilter === undefined
            ? hasActions
            : item.hasFilter;
        item.hasDelete = item.hasDelete === undefined ? hasActions : item.hasDelete;

        const description = (
            <>
                {item.type === 'float' && <SigmaIcon size="small" color="secondary" className={styles.sigma} />}
                {item.description && item.description?.length > 0 ? item.description : item.label}
            </>
        );
        return (
            <>
                <div
                    onClick={this.handleSelect}
                    className={cn(styles.container, {
                        [styles.disabled]: item.disabled,
                        [styles.notRelevant]: item.isIrrelevant,
                        [styles.selected]: !hasCheck && item.isSelected,
                        [styles.error]: item.status === 'error',
                        [styles.warn]: item.status === 'warn',
                    })}
                    style={{
                        paddingLeft: `calc((var(--ui-kit-spacing-12) + var(--ui-kit-spacing-2)) * ${
                            level ?? 0
                        } + var(--ui-kit-spacing-4))`,
                    }}
                >
                    <div className={styles.title}>
                        {(item.hasChild || item.hasChildToUpload) && item?.child?.length ? (
                            item.isLoading ? (
                                <div className={styles.icon_container}>
                                    <Loader size="small" />
                                </div>
                            ) : (
                                <IconButton
                                    size="small"
                                    color="secondary"
                                    variant="text"
                                    onClick={this.handleToggleDropdown}
                                    icon={item.isActiveDropdown ? DropDownIcon : DropRightIcon}
                                />
                            )
                        ) : (
                            <div className={styles.icon_container} />
                        )}
                        {hasCheck ? (
                            <Checkbox
                                checked={item.isSelected}
                                onChange={this.handleSelect}
                                // @ts-expect-error
                                label={description}
                                disabled={item.disabled}
                                className={item.isUsed ? styles.used : ''}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span>{description}</span>
                        )}
                    </div>
                    {!isDragging && (
                        <div className={styles.actions}>
                            {sortable && item.isSelected && (
                                <>
                                    <IconButton
                                        icon={IndicatorUpIcon}
                                        size="small"
                                        onClick={this.handleMoveUp}
                                        variant="text"
                                        title="Переместить вверх"
                                    />
                                    <IconButton
                                        icon={IndicatorDownIcon}
                                        size="small"
                                        onClick={this.handleMoveDown}
                                        variant="text"
                                        title="Переместить вниз"
                                    />
                                </>
                            )}

                            {item.notices?.map((notice: ILayerNoticeItem, i: number) => (
                                <Notice key={i} {...notice} />
                            ))}

                            {hasShift && !isSubDimensionAsDimension && (
                                <ShiftLevelPivot
                                    size="small"
                                    item={item}
                                    blockType={blockType}
                                    pivotParams={pivotParams}
                                    setPivotParams={setPivotParams}
                                />
                            )}
                            {item.hasSorting && (
                                <SortPivot
                                    size="small"
                                    item={item}
                                    blockType={blockType}
                                    pivotParams={pivotParams}
                                    setPivotParams={setPivotParams}
                                />
                            )}
                            {item.hasFilter && (
                                <FilterPivot
                                    size="small"
                                    item={item}
                                    blockType={blockType}
                                    pivotParams={pivotParams}
                                    setPivotParams={setPivotParams}
                                />
                            )}
                            {item.hasDelete && (
                                <IconButton
                                    icon={DeleteIcon}
                                    size="small"
                                    onClick={this.handleDelete}
                                    variant="text"
                                    color="error"
                                    title="Удалить"
                                />
                            )}
                        </div>
                    )}
                </div>

                {!isDragging && item.hasChild && item.isActiveDropdown && item.child.length > 0 && (
                    <SortableContainer id={`${blockType}_${uuid}_${item.id}`} type={blockType} items={item.child}>
                        {item.child.map((item: any) => (
                            <SortableItem
                                key={`${blockType}_${item.id}`}
                                id={`${blockType}_${item.id}`}
                                className={styles.sortable__item}
                                uuid={uuid}
                                sourceBlock={blockType}
                                elementData={item}
                            >
                                {(isChildDragging: boolean) => (
                                    // @ts-expect-error
                                    <ActiveItem
                                        blockType={blockType}
                                        hasShift={item.typeParam === 'Dimension'}
                                        uuid={uuid}
                                        item={item}
                                        isDragging={isChildDragging}
                                        hasCheck={hasCheck}
                                        pivotParams={pivotParams}
                                        setPivotParams={setPivotParams}
                                        onMoveUp={onMoveUp}
                                        onMoveDown={onMoveDown}
                                        level={(level ?? 0) + 1}
                                        onSelect={onSelect}
                                        onDelete={onDelete}
                                        hasActions={hasActions}
                                        sortable={sortable}
                                    />
                                )}
                            </SortableItem>
                        ))}
                    </SortableContainer>
                )}
            </>
        );
    }
}
