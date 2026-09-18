import { Component } from 'react';
import MyIcon from 'components/ui/MyIcon/MyIcon';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import $modal from 'components/ui/MyModal/modal.helper';
import { Button } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class MetaOLAPPage extends Component {
    newCubeClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        const body = {
            id: this.props.id,
        };
        $api.post(url, body)
            .then(() => {
                this.onClick(); // Переоткроем форму, уже должен появиться Куб
            })
            .catch(() => {
                $message.show('Ошибка создания нового Куба');
            });
    };

    onClick = () => {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.get(url)
            .then((res) => {
                const pages = res.data ?? [];
                $modal.show(
                    'OLAP Кубы для просмотра',
                    <div>
                        <div className="d-flex justify-content-between">
                            {pages.length > 0 &&
                                pages.map((page) => (
                                    <a href={`/${page.uri}`} target="_blank" rel="noreferrer">
                                        {page.description}
                                    </a>
                                ))}
                            {pages.length === 0 && <Button onClick={this.newCubeClick}>Создать новый Куб</Button>}
                        </div>
                    </div>,
                );
            })
            .catch(() => {
                $message.show('Ошибка получения стриниц кубов');
            });
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
