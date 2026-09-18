import React, { Component } from 'react';
import { Button, CloseIcon } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import $modal from 'components/ui/MyModal/modal.helper';
import HooksManager from 'helpers/lite-react-hooks';
import StateManager from 'lite-react-statemanager';

const ConfirmDialog = ({ onSave, onClose }) => (
    <div style={{ textAlign: 'center' }}>
        <p>Сохранить изменения перед закрытием?</p>
        <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Button color="success" onClick={onSave}>
                Да
            </Button>
            <Button color="secondary" onClick={onClose}>
                Нет
            </Button>
            <Button color="danger" onClick={() => $modal.hide()}>
                Отмена
            </Button>
        </div>
    </div>
);

export class CloseButton extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
        };
    }

    handleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const dm = this.props?.DataManager;
        if (!dm) return;

        $modal.show('Подтверждение', <ConfirmDialog onSave={this.saveAndClose} onClose={this.closeWithoutSave} />, {
            size: 'sm',
            hideWhenClickBackdrop: false,
        });
    };

    saveAndClose = async () => {
        const dm = this.props?.DataManager;
        if (!dm) return;

        this.setState({ loading: true });
        try {
            const res = await dm.Save();
            if (res) {
                const {parentModalUUID} = dm;
                const operationType = dm.lastOperationType;

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
            }

            StateManager.setState({
                flash: {
                    show: true,
                    content: 'Успешно сохранено!',
                },
            });

            $modal.hide();
            $windows.close(dm.modalUUID);
        } catch (err) {
            console.error('Ошибка сохранения перед закрытием:', err);
            StateManager.setState({
                flash: {
                    show: true,
                    content: 'Произошла ошибка при сохранении',
                },
            });
            $modal.hide();
            $modal.show('Ошибка', 'Не удалось сохранить изменения. Попробуйте снова.');
        } finally {
            this.setState({ loading: false });
        }
    };

    closeWithoutSave = () => {
        const dm = this.props?.DataManager;
        if (!dm) return;

        $modal.hide();
        $windows.close(dm.modalUUID);
    };

    render() {
        return (
            <Button leftIcon={CloseIcon} color="secondary" onClick={this.handleClick} loading={this.state.loading}>
                Закрыть
            </Button>
        );
    }
}
