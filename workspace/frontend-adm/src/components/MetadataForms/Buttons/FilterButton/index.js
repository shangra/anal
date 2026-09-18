import { Component } from 'react';
import { Button } from 'ui-kit';
import { FilterIcon } from 'components/MetadataForms/Buttons/FilterButton/Icon/filter.icon';
import { FilterWindow } from 'components/MetadataForms/Buttons/FilterWindow';
import { Api } from 'components/MetadataForms/DataManager/Api';

export class FilterButton extends Component {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Filter обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;

        this.description = this.props?.description ?? 'Отбор и сортировка';
        this.title = this.props?.title ?? 'Отбор и сортировка';

        this.state = {
            type: this.props.type ?? 'icon',
            fields: [],
            filters: null,
            tempFilters: null,
        }
    }
    
    componentDidMount() {
        this.getFieldsByObject(this.DataManager.metaOwner);
    }

    async getFieldsByObject(fromObject) {
        if(fromObject) {
            const res = await Api.fetchFieldsByObject(fromObject, this.DataManager?.server);
            this.setState( {fields: [...res.registryFields, ...res.registryTableFields]} )    
        }
    }

    applyResult = (filters, where) => {
        this.setState({ filters });

        this.DataManager.options = {
            ...this.DataManager.options,
            where,
            offset: 0,
            withHierarchy: false
        };
        
        this.DataManager.pages = null;

        this.DataManager.ReloadData();        
    }

    onClick = (e) => {
        e.stopPropagation();

        const FW = new FilterWindow({
            title: this.title,
            fields: this.state.fields,
            initialValue: this.state.filters,
            callback: this.applyResult
        });
        FW.open();
    };

    render() {
        return (
            <Button title={this.title} leftIcon={FilterIcon} onClick={this.onClick} color="primary">
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}