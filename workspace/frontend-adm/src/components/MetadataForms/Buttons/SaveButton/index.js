import React, { Component } from 'react';
import { Button, PlusIcon } from 'ui-kit';
import HooksManager from 'helpers/lite-react-hooks';
import StateManager from 'lite-react-statemanager';

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
                const {parentModalUUID} = dm;
                const {operationType} = res;

                if (parentModalUUID) {
                    if (operationType === 'update') {
                        HooksManager.setHook({
                            [`${parentModalUUID}__reload_without_pagination_reset`]: {
                                reloadElementsList: null,
                            },
                        });
                    } else if (operationType === 'create') {
                        HooksManager.setHook({
                            [`${parentModalUUID}__reload_with_pagination_reset`]: {
                                reloadElementsList: null,
                            },
                        });
                    }
                }

                StateManager.setState({
                    flash: {
                        show: true,
                        content: 'Успешно сохранено!',
                    },
                });
            })
            .catch((err) => {
                console.log('err', err);
                StateManager.setState({
                    flash: {
                        show: true,
                        content: 'Произошла ошибка при сохранении',
                    },
                });
            })
            .finally(() => {
                this.setState({ loading: false });
            });
    };

    render() {
        return (
            <Button
                color="primary"
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
