import React, { Component } from 'react';
import { Button } from 'ui-kit';
import { AddIcon } from 'components/MetadataForms/Icons/add.icon';
import StateManager from 'lite-react-statemanager';
import $windows from 'components/WindowsCMP/windows.helper';
import { FormMetadata } from 'components/FormMetadata';

const RECENT_TABLE_ID = 'recentTableId';

export class Based extends Component {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'На основании';
        this.title = this.props?.title ?? 'На основании';
    }

    // componentDidMount() {
    //     if (this.props.to) {
    //         StateManager.subscribeState({
    //             [`${this.props.to}__${this.formId}`]: { [`ADD__${this.props.to}__${this.formId}`]: this.onChangeListState },
    //         });
    //     }
    // }

    // componentWillUnmount() {
    //     if (this.props.to) {
    //         StateManager.unsubscribeState({
    //             [`${this.props.to}__${this.formId}`]: [`ADD__${this.props.to}__${this.formId}`],
    //         });
    //     }
    // }

    // onChangeListState = (subscribe) => {
    //     const name = `${this.props.to}__${this.formId}`;
    //     const listState = subscribe[name];
    //     // console.log("Add onChangeListState", listState)
    // }

    onClick = (e) => {
        e.stopPropagation();

        const id = this.DataManager?.metadata?.id;
        const primaryKey = this.DataManager?.primaryKey;
        // const uuid = uuidv4();

        StateManager.setState({ [RECENT_TABLE_ID]: this.DataManager.formId });

        $windows.open(
            'Новый элемент',
            <FormMetadata id={id} type="element" element={null} server={this.DataManager?.server} primaryKey={primaryKey} method="POST" />,
            {
                uuid: null,
            },
        );
    };

    render() {
        return (
            <Button title={this.title} leftIcon={AddIcon} onClick={this.onClick} color="success">
                {this.props.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
