import { Component } from 'react';
import $api from 'helpers/axios';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import $modal from 'components/ui/MyModal/modal.helper';
import { Button } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class MetaPushToML extends Component {
    action = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service, 'upload');
        $api.post(url).then(() => $modal.hide());
    };

    onClick = () => {
        $modal.show(
            'Отправить данные на проверку?',
            <div>
                <div className="d-flex justify-content-between">
                    <Button onClick={this.action}>Отправить данные на проверку?</Button>
                </div>
            </div>,
        );
    };

    render() {
        const iconClassName = 'ms-1';
        return (
            <div>
                <MyIcon
                    title={this.props.title}
                    icon={this.props.icon}
                    size={this.props.size ?? 25}
                    className={iconClassName}
                    onClick={this.onClick}
                />
            </div>
        );
    }
}
