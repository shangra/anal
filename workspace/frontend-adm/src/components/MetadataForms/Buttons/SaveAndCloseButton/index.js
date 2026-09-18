import { Component } from 'react';
import { Button, SuccessIcon } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import HooksManager from 'helpers/lite-react-hooks';
import StateManager from 'lite-react-statemanager';

export class SaveAndCloseButton extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
        };
    }

    onClick = async () => {
        this.setState({ loading: true });
        const dm = this.props?.DataManager;
        try {
            const res = await dm?.Save?.();
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

            $windows.close(dm.modalUUID);
        } catch (err) {
            console.log('err', err);
            StateManager.setState({
                flash: {
                    show: true,
                    content: 'Произошла ошибка при сохранении',
                },
            });
        } finally {
            this.setState({ loading: false });
        }
    };

    render() {
        return (
            <Button leftIcon={SuccessIcon} loading={this.state.loading} color="success" onClick={this.onClick}>
                Сохранить и Закрыть
            </Button>
        );
    }
}
