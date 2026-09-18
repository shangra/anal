import React, { Component } from 'react';

import { FilterComplexCMP } from '../../FilterComplexCMP';
import { updateArrayByItemId } from '../helpers/params';
import ServerContext from '../ServerContext';

export class FilterPivot extends Component {
    static contextType = ServerContext;

    setFilter = (filterData) => {
        const { filters, filterCached } = filterData;

        let tempArray = updateArrayByItemId(
            this.props.pivotParams?.[this.props.blockType],
            this.props.item.id,
            'filter',
            filters,
        );

        tempArray = updateArrayByItemId(tempArray, this.props.item.id, 'filterCached', filterCached || []);

        if (this.props.setPivotParams) {
            this.props.setPivotParams(
                {
                    ...this.props.pivotParams,
                    [this.props.blockType]: tempArray,
                },
                true,
            );
        }
    };

    render() {
        const type = this.props?.item?.type?.toLowerCase();
        const filterCached = this.props?.item?.filterCached ?? [];

        return (
            <FilterComplexCMP
                size={this.props.size}
                className=""
                filterSetter={this.setFilter}
                filterDefault={this.props.item?.filter}
                type={type}
                name={this.props.item?.name}
                label={this.props.item?.name}
                description={this.props.item?.description || this.props.item?.label}
                metaref={this.props.item.ref}
                server={this.context}
                filterCached={filterCached}
            />
        );
    }
}
