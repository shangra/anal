import { Button } from 'ui-kit';
import { DeleteMarkIcon } from 'components/MetadataForms/Icons/deletemark.icon';
import $confirm from 'ui/MyConfirm/confirm';
import HooksManager from 'helpers/lite-react-hooks';
import { General } from 'components/MetadataForms/Buttons/General';

export class DeleteMark extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента DeleteMark обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Удалить';
        this.title = this.props?.title ?? 'Удалить';

        this.state = {
            disable: true,
            elements: [],
            type: this.props.type ?? 'icon',
        };
        this.initState('DELETE_MARK');
    }

    onClick = async (e) => {
        $confirm('Пометить на удаление?', (isYes)=>{
            if (isYes) {
                const modalUUID = this.props.DataManager?.modalUUID;
                this.DataManager.MarkDeleted() // this.state.elements
                    .then(() => {
                        if (modalUUID) {
                            HooksManager.setHook({
                                [`${modalUUID}__reload_without_pagination_reset`]: {
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
                leftIcon={DeleteMarkIcon}
                disabled={this.state.disable}
                onClick={this.onClick}
                color="error"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
