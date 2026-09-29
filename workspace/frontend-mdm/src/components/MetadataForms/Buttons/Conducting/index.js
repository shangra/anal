import { Button, Popover } from 'ui-kit';
import { ConductingIcon } from '../../Icons/conducting.icon.js';
import $confirm from '../../../ui/MyConfirmMDM/confirm';
import $modal from '../../../ui/modal.helper.js';
import $api from '../../../../helpers/axios.jsx';
import { General } from '../General';

export class Conducting extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager)
            console.error(
                'Для работы компонента Conducting обязателен параметр DataManager!'
            );

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
        $api.get(`/metadata/transferconduct/${id}?options=${options}`, {
            fetchOptions: { async: true },
        }).then((res) => {
            this.setState({ show: res.data.result });
        });
    }

    sendConductingAcceptRequest(link, ids) {
        $api.post(
            `/metadata/transferconduct/${link}`,
            { id: ids, type: 'conduct' },
            { fetchOptions: { async: true } }
        ).then((res) => {
            $modal.show(
                'Закончился процесс проведения документа',
                <div>Закончился процесс проведения документа {ids}</div>
            );
        });
    }

    sendConductingRejectRequest(link, ids) {
        $api.delete(`/metadata/transferconduct/${link}`, {
            data: { id: ids, type: 'conduct' },
            fetchOptions: { async: true },
        }).then((res) => {
            $modal.show(
                'Закончился процесс распроведения документа',
                <div>Закончился процесс распроведения документа {ids}</div>
            );
        });
    }

    onClickAccept = (e) => {
        $confirm('Провести?', (isYes) => {
            if (isYes) {
                let elements;
                if (this.props.for === 'object') {
                    elements = [this.DataManager.element];
                } else {
                    elements = this.DataManager.selectedRows.map((el) => el.id);
                }
                this.sendConductingAcceptRequest(
                    this.DataManager?.metadata?.id,
                    elements
                );
            }
        });
    };

    onClickReject = (e) => {
        //
        $confirm('Распровести?', (isYes) => {
            if (isYes) {
                let elements;
                if (this.props.for === 'object') {
                    elements = [this.DataManager.element];
                } else {
                    elements = this.DataManager.selectedRows.map((el) => el.id);
                }
                this.sendConductingRejectRequest(
                    this.DataManager?.metadata?.id,
                    elements
                );
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
                                <Button
                                    title={'Провести'}
                                    onClick={this.onClickAccept}
                                    color='success'
                                >
                                    {this.props.type !== 'icon'
                                        ? 'Провести'
                                        : ''}
                                </Button>
                                <Button
                                    title={'Распровести'}
                                    onClick={this.onClickReject}
                                    color='secondary'
                                >
                                    {this.props.type !== 'icon'
                                        ? 'Распровести'
                                        : ''}
                                </Button>
                            </div>
                        } // Содержимое, отображаемое в поповере
                    >
                        <Button
                            title={this.title}
                            leftIcon={ConductingIcon}
                            // onClick={this.onClick}
                            color='success'
                        >
                            {this.props.type !== 'icon' ? this.description : ''}
                        </Button>
                    </Popover>
                )}
            </>
        );
    }
}
