import React, { PureComponent } from 'react';
import { IconButton } from 'ui-kit';

import { FilterIcon } from '../UiKitIcons/FilterIcon';
import { FilterOutlineIcon } from '../UiKitIcons/FilterOutlineIcon';
import { FilterModal } from './FilterModal';

// filterDefault - фильтрация по умолчанию, если такая имеется
// filterSetter - вызывавается при изменении фильтрации, возвращает массив объектов с полями фильтрации
// overlayRootClose - значение false не дает закрывать Popover по клику вне области фильтрации

export class FilterComplexCMP extends PureComponent {
    constructor(props) {
        super(props);

        this.server = (props.server || '').replace(/\/+$/gm, '');
    }

    componentDidUpdate(prevProps, _prevState, _snapshot) {
        if (prevProps.server !== this.props.server) {
            this.server = (this.props.server || '').replace(/\/+$/gm, '');
        }
    }

    render() {
        const { filterDefault } = this.props;

        const filteredItems = filterDefault?.filter((item) => item.value === 0 || item.value || item.from || item.to) ?? [];
        const isFilterActive = filteredItems.length > 0;

        return (
            <FilterModal
                title={this.props.description || this.props.name}
                type={this.props.type}
                name={this.props.name}
                metaref={this.props.metaref}
                filterDefault={this.props.filterDefault}
                filterSetter={this.props.filterSetter}
                filterCached={this.props.filterCached}
                server={this.server}
            >
                <IconButton
                    size="small"
                    variant="text"
                    color={isFilterActive ? 'primary' : 'secondary'}
                    icon={isFilterActive ? FilterIcon : FilterOutlineIcon}
                    title="Фильтровать"
                />
            </FilterModal>
        );
    }
}
