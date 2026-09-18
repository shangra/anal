// import { Component } from 'react';
import { Button } from 'ui-kit';
import { CopyIcon } from 'components/MetadataForms/Icons/copy.icon';
import StateManager from 'lite-react-statemanager';
import $windows from 'components/WindowsCMP/windows.helper';
import { FormMetadata } from 'components/FormMetadata';
// import HooksManager from 'helpers/lite-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { General } from 'components/MetadataForms/Buttons/General';

const RECENT_TABLE_ID = 'recentTableId';

export class Copy extends General {
    constructor(props) {
        super(props);        
        
        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Copy обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;

        this.description = this.props?.description ?? 'Копировать';
        this.title = this.props?.title ?? 'Копировать';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('COPY');
    }

    onClick = (e) => {
        e.stopPropagation();

        const id = this.DataManager?.metadata?.id;
        const primaryKey = this.DataManager?.primaryKey;
        const element = this.DataManager.selectedRows.map(el=>el.id)[0]; // Возьмем только первый
        const description = this.DataManager?.metadata?.description;

        const modalUUID = uuidv4();
        StateManager.setState({ [RECENT_TABLE_ID]: this.DataManager.formId });

        $windows.open(
            `${description} (Копирование)`,
            <FormMetadata
                id={id}
                type="element"
                element={element}
                server={this.DataManager?.server}
                payload={{
                    modalUUID,
                    parentModalUUID: this.props.DataManager?.modalUUID,
                }}
                primaryKey={primaryKey}
                method="copy"
            />,
            { uuid: modalUUID },
        );
    };

    calculateDisableState = (selectedRows) => !selectedRows || selectedRows.length !== 1

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={CopyIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="primary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
