import React, { Component } from 'react';
import { Button } from 'ui-kit';
import { ReloadIcon } from 'components/MetadataForms/Icons/reload.icon';

const RECENT_TABLE_ID = 'recentTableId';

export class Reload extends Component {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Reload обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;

        this.description = this.props?.description ?? 'Обновить';
        this.title = this.props?.title ?? 'Обновить';

        this.state = {
            type: this.props.type ?? 'icon',
        };
    }

    onClick = (e) => {
        e.stopPropagation();
        this.DataManager.ReloadData();
    };

    render() {
        return (
            <Button title={this.title} leftIcon={ReloadIcon} onClick={this.onClick} color="success">
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
