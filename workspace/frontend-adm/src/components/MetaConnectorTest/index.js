import { Component } from 'react';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import { IconButton } from 'ui-kit';
import { getNewIcon } from 'helpers/icon-adapter.helper';
import { buildUrl } from 'helpers/buildUrl';

export class MetaConnectorTest extends Component {
    onClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.get(url)
            .then(({ data: { result } }) => {
                $message.show(result ? 'Подключение прошло успешно' : 'Не удалось подключиться');
            })
            .catch(() => {
                $message.show('Ошибка при проверке подключения');
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
