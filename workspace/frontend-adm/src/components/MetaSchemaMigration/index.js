import { Component } from 'react';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import { buildUrl } from 'helpers/buildUrl';

export class MetaSchemaMigration extends Component {
    onClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.get(url)
            .then(() => {
                // console.log(res.data);
            })
            .catch(() => {
                $message.show('Ошибка миграции схем!');
            });
    };

    render() {
        const { title, icon, size } = this.props;
        const iconClassName = 'ms-1';
        return (
            <div>
                <MyIcon title={title} icon={icon} size={size ?? 25} className={iconClassName} onClick={this.onClick} />
            </div>
        );
    }
}
