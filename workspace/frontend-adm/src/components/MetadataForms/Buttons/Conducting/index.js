import { Button, Popover } from 'ui-kit';
import { ConductingIcon } from 'components/MetadataForms/Icons/conducting.icon';
import $confirm from 'ui/MyConfirm/confirm';
import $modal from 'components/ui/MyModal/modal.helper';
import $api from 'helpers/axios';
import { General } from 'components/MetadataForms/Buttons/General';
import { buildUrl } from 'helpers/buildUrl';

export class Conducting extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Conducting обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Провести';
        this.title = this.props?.title ?? 'Провести';

        this.state = {
            show: false,
            disable: true,
            elements: [],
        };
        this.initState('CONDUCTING');
    }

    componentDidMount = () => {
        this.getConductingRequest(this.DataManager?.metadata?.id);
    };

    getConductingRequest(id) {
        const options = encodeURIComponent(JSON.stringify({ type: 'conduct' }));
        const url = buildUrl(this.DataManager?.server, `metadata/transfer/${id}?options=${options}`)
        $api.get(url, { fetchOptions: { async: true} })
            .then((res) => {
                this.setState({ show: res.data.result });
            });
    }

    sendConductingAcceptRequest(link, ids) {
        const url = buildUrl(this.DataManager?.server, `metadata/transfer/${link}`)
        $api.post(url, { id: ids, type: 'conduct' }, { fetchOptions: { async: true} })
            .then((res) => {
                $modal.show(
                    "Закончился процесс проведения документа",
                    (<div>Закончился процесс проведения документа {ids}</div>)
                )
            });
    }

    sendConductingRejectRequest(link, ids) {
        const url = buildUrl(this.DataManager?.server, `metadata/transfer/${link}`)
        $api.delete(url, { data: { id: ids, type: 'conduct' }, fetchOptions: { async: true} })
            .then((res) => {
                $modal.show(
                    "Закончился процесс распроведения документа",
                    (<div>Закончился процесс распроведения документа {ids}</div>)
                )
            });
    }

    onClickAccept = (e) => {
        $confirm('Провести?', (isYes)=>{
            if (isYes) {
                let elements;
                if (this.props.for === "object") {
                    elements = [this.DataManager.element];
                } else {
                    elements = this.DataManager.selectedRows.map(el=>el.id);
                }
                this.sendConductingAcceptRequest(this.DataManager?.metadata?.id, elements);
            }
        });
    };

    onClickReject = (e) => {
        //
        $confirm('Распровести?', (isYes) => {
            if (isYes) {
                let elements;
                if (this.props.for === "object") {
                    elements = [this.DataManager.element];
                } else {
                    elements = this.DataManager.selectedRows.map(el=>el.id);
                }
                this.sendConductingRejectRequest(this.DataManager?.metadata?.id, elements);
            }
        });
    };

    render() {
        return (
            <>
                {this.state.show && (
                    <Popover
                        content={
                            <div>
                                <Button title="Провести" onClick={this.onClickAccept} color="success">
                                    {this.props.type !== 'icon' ? 'Провести' : ''}
                                </Button>
                                <Button title="Распровести" onClick={this.onClickReject} color="secondary">
                                    {this.props.type !== 'icon' ? 'Распровести' : ''}
                                </Button>
                            </div>
                        } // Содержимое, отображаемое в поповере
                    >
                        <Button
                            title={this.title}
                            leftIcon={ConductingIcon}
                            // onClick={this.onClick}
                            color="success"
                        >
                            {this.props.type !== 'icon' ? this.description : ''}
                        </Button>
                    </Popover>
                )}
            </>
        );
    }
}
