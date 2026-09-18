import { Component } from 'react';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import DownloadJS from '../../vendors/download-react';
import { IconButton } from 'ui-kit';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { buildUrl } from 'helpers/buildUrl';

export class MetaDumpDB extends Component {
    onClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        const dumpName = `Metadata_${this.props.id}`;
        $api.get(url)
            .then((res) => {
                const jsonText = JSON.stringify(res.data, null, '    ');
                DownloadJS(jsonText, `${dumpName}.json`, 'application/json; charset=utf-8');
                $message.show('Дамп создан');
            })
            .catch(() => {
                $message.show('Ошибка формирования дампа!');
            });
    };

    render() {
        return (
            <div>
                <IconButton
                    title={this.props.title}
                    icon={getNewIcon(this.props.icon)}
                    onClick={this.onClick}
                    variant="outlined"
                    rounded
                />
            </div>
        );
    }
}
