// import React, { Component } from 'react';
import { Button } from 'ui-kit';
import { DeleteIcon } from '../../Icons/delete.icon.js';
import $confirm from '../../../ui/MyConfirmMDM/confirm';
// import { MyConfirmMDM } from '../../../ui/MyConfirmMDM';
import HooksManager from '../../../../helpers/lite-react-hooks/index.js';
import { General } from '../General';

export class Delete extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager)
            console.error(
                'Для работы компонента Delete обязателен параметр DataManager!'
            );

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? '';
        this.title = this.props?.title ?? 'Удалить безвозвратно';

        this.state = {
            elements: [],
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('DELETE');
    }

    onClick = async (e) => {
        $confirm('Удалить?', (isYes) => {
            if (isYes) {
                this.DataManager.Delete().then(() => {
                    const modalUUID = this.props.DataManager?.modalUUID;
                    if (modalUUID) {
                        HooksManager.setHook({
                            [`${modalUUID}__reload_with_pagination_reset`]: {
                                reloadElementsList: null,
                            },
                        });
                    }
                });
            }
        });
    };

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={DeleteIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color='error'
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
