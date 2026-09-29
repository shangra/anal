import { Component } from 'react';
import { Button, SuccessIcon } from 'ui-kit';
import $windows from '../../../ui/windows.helper';
import HooksManager from '../../../../helpers/lite-react-hooks';

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
                        [`${parentModalUUID}__reload_with_pagination_reset`]: {
                            reloadElementsList: null,
                        },
                    });
                }
            }
            $windows.close(dm.modalUUID);
        } catch (err) {
            console.log('err', err);
        } finally {
            this.setState({ loading: false });
        }
    };

    render() {
        return (
            <Button
                leftIcon={SuccessIcon}
                loading={this.state.loading}
                color='success'
                onClick={this.onClick}
            >
                Сохранить и Закрыть
            </Button>
        );
    }
}
