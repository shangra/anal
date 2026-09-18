import React, { Component } from 'react';
import { Button } from 'ui-kit';
import { AddIcon } from 'components/MetadataForms/Icons/add.icon';
import { v4 as uuidv4 } from 'uuid';
import StateManager from 'lite-react-statemanager';
import $windows from 'components/WindowsCMP/windows.helper';
import { FormMetadata } from 'components/FormMetadata';

const RECENT_TABLE_ID = 'recentTableId';

export class Rls extends Component {
    constructor(props) {
        super(props);

        // console.log("Add", this.props)

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;

        this.description = this.props?.description ?? 'Добавить';
        this.title = this.props?.title ?? 'Добавить';

        this.state = {
            type: this.props.type ?? 'icon',
        };
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
        const description = this.DataManager?.metadata?.description;

        StateManager.setState({ [RECENT_TABLE_ID]: this.DataManager.formId });

        const modalUUID = uuidv4();
        const parent = this.DataManager?.options?.where?.parent
        $windows.open(
            `${description} (Создание)`,
            <FormMetadata
                id={id}
                type="element"
                element={null}
                server={this.DataManager?.server}
                payload={{
                    modalUUID,
                    parentModalUUID: this.props.DataManager?.modalUUID,
                    parent
                }}
                primaryKey={primaryKey}
                method="POST"
            />,
            {
                uuid: modalUUID,
            },
        );
    };

    render() {
        return (
            <Button title={this.title} leftIcon={AddIcon} onClick={this.onClick} color="success">
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
