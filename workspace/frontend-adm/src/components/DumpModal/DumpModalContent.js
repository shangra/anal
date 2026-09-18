import React, { Component } from 'react';
import Form from 'react-bootstrap/Form';
import style from './DumpModalContent.module.css';
import $api from 'helpers/axios';
import { uploadFile } from 'helpers/uploadFile';
import StateManager from 'lite-react-statemanager';
import { $modal } from 'components/ui/MyModal/modal.helper';
import { ESB_ENABLED } from 'settings/settings';

class DumpModalContent extends Component {
    constructor(props) {
        super(props);

        this.inputRef = React.createRef();

        this.state = {
            serverData: [],
            server: '',
        };
    }

    componentDidMount() {
        this.getServers();
    }

    getServers = () => {
        $api.get('/systemsettings/servers/info').then((response) => {
            this.setState({
                serverData: Object.keys(response.data),
            });
            this.setState({
                server: Object.keys(response.data)[0],
            });
        });
    };

    onChangeServer = (ev) => {
        if (ev.currentTarget.value !== undefined) {
            this.setState({ server: ev.target.value });
        }
    };

    uploadFiles = (ev) => {
        ev.preventDefault();
        this.inputRef.current.click();
    };

    onSelectFiles = async (ev) => {
        const fileInput = ev.target;
        const files = [...fileInput.files];
        const maxCount = files.length;

        const url = `${ESB_ENABLED ? this.state.server : ''}/dumpdb/restore`;
        const method = 'post';
        const data = {};

        let count = 0;

        const promises = files.map(
            (file) =>
                new Promise((resolve, reject) => {
                    uploadFile(method, url, data, file, new URLSearchParams([['recursive', 'true']]))
                        .then((res) => {
                            count++;
                            const percent = maxCount === count ? 100 : Math.round((count / maxCount) * 100);
                            $modal.show('Загрузка файлов', <h1>{percent}%</h1>);
                            resolve(res);
                        })
                        .catch(() => {
                            $modal.hide();
                            reject();
                        });
                }),
        );
        $modal.show('Загрузка файлов', <h1>{0}%</h1>);

        let err;
        try {
            await Promise.all(promises);
        } catch (e) {
            err = e;
            console.error(err);
            StateManager.setState({ flash: { show: true, content: <div>Не удалось загрузить дамп: {err.message}</div> } });
        }

        if (!err) {
            StateManager.setState({ flash: { show: true, content: <div>Дамп загружен!</div> } });
        }

        fileInput.value = '';
    };

    render() {
        return (
            <div>
                <Form.Group className={style.containerSelect}>
                    <Form.Label style={{ margin: '0px' }}>Выбрать сервер</Form.Label>
                    <Form.Select className={style.select} onChange={this.onChangeServer} name="publishNotificate">
                        {this.state.serverData.map((item) => (
                            <option value={item} key={item}>
                                {item}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <div className={style.button}>
                    <div
                        onClick={this.uploadFiles}
                        style={{ width: 200, cursor: 'pointer' }}
                        className="btn-mis btn btn-primary"
                    >
                        Выбрать дамп
                    </div>
                </div>

                <input ref={this.inputRef} type="file" multiple style={{ display: 'none' }} onChange={this.onSelectFiles} />
            </div>
        );
    }
}

export default DumpModalContent;
