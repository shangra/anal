import React, { Component } from 'react';
import { Button, PlusIcon } from 'ui-kit';
import HooksManager from '../../../../helpers/lite-react-hooks';

export class SaveButton extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
        };
    }

    onClick = () => {
        this.setState({ loading: true });
        this.props?.DataManager?.Save?.()
            .then((res) => {
                const dm = this.props.DataManager;
                const parentModalUUID = dm.parentModalUUID;
                const operationType = res.operationType;

                if (parentModalUUID) {
                    if (operationType === 'update') {
                        HooksManager.setHook({
                            [`${parentModalUUID}__reload_without_pagination_reset`]:
                                {
                                    reloadElementsList: null,
                                },
                        });
                    } else if (operationType === 'create') {
                        HooksManager.setHook({
                            [`${parentModalUUID}__reload_with_pagination_reset`]:
                                {
                                    reloadElementsList: null,
                                },
                        });
                    }
                }
            })
            .catch((err) => {
                console.log('err', err);
            })
            .finally(() => {
                this.setState({ loading: false });
            });
    };

    render() {
        return (
            <Button
                color='primary'
                loading={this.state.loading}
                disabled={this.state.loading}
                leftIcon={PlusIcon}
                onClick={this.onClick}
            >
                Сохранить
            </Button>
        );
    }
}
