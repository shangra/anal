// import { Component } from 'react';
import { Button } from 'ui-kit';
import { CopyIcon } from '../../Icons/copy.icon.js';
import StateManager from 'lite-react-statemanager';
import $windows from '../../../ui/windows.helper.js';
import { FormMetadata } from '../../../FormMetadata/index.js';
// import HooksManager from '../../../../helpers/lite-react-hooks/index.js';
import { v4 as uuidv4 } from 'uuid';
import { General } from '../General';

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
        const description = this.DataManager?.metadata?.description;
        const targets = this.DataManager.resolveSelectionTargets();

        if (targets.length === 0) return;

        StateManager.setState({ [RECENT_TABLE_ID]: this.DataManager.formId });

        targets.forEach((element) => {
            const modalUUID = uuidv4();
            $windows.open(
                `${description} (Копирование)`,
                <FormMetadata
                    id={id}
                    type="element"
                    element={element}
                    payload={{
                        modalUUID,
                        parentModalUUID: this.props.DataManager?.modalUUID,
                    }}
                    primaryKey={primaryKey}
                    method="copy"
                />,
                { uuid: modalUUID },
            );
        });
    };

    calculateDisableState = (selectedRows) => !selectedRows || selectedRows.length === 0;

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
