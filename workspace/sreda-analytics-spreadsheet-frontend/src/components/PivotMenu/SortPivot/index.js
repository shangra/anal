import React, { PureComponent } from 'react';
import { IconButton, List, Popover } from 'ui-kit';

import { SortAscIcon } from '../../UiKitIcons/SortAsc';
import { SortDescIcon } from '../../UiKitIcons/SortDescIcon';
import { SortIcon } from '../../UiKitIcons/SortIcon';
import { updateArrayByItemId } from '../helpers/params';

export class SortPivot extends PureComponent {
    setSort = (sort) => {
        const { blockType, pivotParams, item, setPivotParams } = this.props;

        // updateArrayByItemId возвращает обновленное дерево объектов блока с типом blockType
        // в котором у элемента item.id поле 'sort' заполнилось значением sort
        let tempArray = updateArrayByItemId(pivotParams?.[blockType], item.id, 'sort', sort);

        // Для блока values: если сортировка устанавливается на меру
        // с дочерними агрегациями, то распространяем её на все типы агрегации
        if (blockType === 'values' && item.hasChild && item.child?.length > 0) {
            item.child.forEach((child) => {
                if (child.sort && child.sort.order && !child.sort.child) {
                    return;
                }
                tempArray = updateArrayByItemId(tempArray, child.id, 'sort', {
                    field: child.name,
                    order: sort.order,
                    child: true,
                });
            });
        }

        // обновление стейта pivotParams в компоненте MetadataPivotMenu сеттером setPivotParams
        // blockType тип fields/columns/rows/values/filter
        if (setPivotParams)
            setPivotParams({
                ...pivotParams,
                [blockType]: tempArray,
            });
    };

    render() {
        let options;
        switch (this.props.item.type) {
            case 'float':
            case 'number':
                options = [
                    {
                        label: 'По возрастанию',
                        title: 'По возрастанию',
                        value: 'ASC',
                    },
                    {
                        label: 'По убыванию',
                        title: 'По убыванию',
                        value: 'DESC',
                    },
                ];
                break;
            case 'date':
                options = [
                    {
                        label: 'От старых к новым',
                        title: 'От старых к новым',
                        value: 'ASC',
                    },
                    {
                        label: 'От новых к старым',
                        title: 'От новых к старым',
                        value: 'DESC',
                    },
                ];
                break;
            default:
                options = [
                    {
                        label: 'От А до Я',
                        title: 'От А до Я',
                        value: 'ASC',
                    },
                    {
                        label: 'От Я до А',
                        title: 'От Я до А',
                        value: 'DESC',
                    },
                ];
                break;
        }

        let icon = SortIcon;
        let color = 'secondary';
        if (this.props.item?.sort?.child) {
            icon = SortIcon;
            color = 'secondary';
        } else if (this.props.item?.sort?.order === 'ASC') {
            icon = SortAscIcon;
            color = 'primary';
        } else if (this.props.item?.sort?.order === 'DESC') {
            icon = SortDescIcon;
            color = 'primary';
        }

        return (
            <Popover
                placement={this.props.placement}
                closeOnOutsideClick={this.props.overlayRootClose ?? true}
                widthMode="auto"
                content={
                    <List
                        resettable
                        type="single"
                        value={[this.props.item?.sort?.order]}
                        options={options}
                        onChange={(value, _option) => {
                            this.setSort({ field: this.props.item.name, order: value[0] ?? '' });
                        }}
                    />
                }
            >
                <IconButton size={this.props.size} variant="text" color={color} icon={icon} title="Сортировать" />
            </Popover>
        );
    }
}
