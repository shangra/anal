import React from 'react';
import { Button, Modal } from 'ui-kit';

import style from './styles.module.css';

export class WarningUnsaveSchema extends React.Component {
    closeModal = () => {
        this.props.onSetOpen(false);
    };

    render() {
        return (
            <Modal
                classNames={style.modal}
                title="Построенный отчет будет утерян. "
                opened={this.props.open}
                onSetOpen={(open) => this.props.onSetOpen(open)}
            >
                <p>Сохранить текущую схему?</p>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}
                >
                    <Button size="medium" variant="outlined" onClick={() => this.props.ifYes()}>
                        Да
                    </Button>
                    <Button size="medium" variant="outlined" onClick={() => this.props.ifNo()}>
                        Нет
                    </Button>
                    <Button size="medium" variant="outlined" onClick={() => this.closeModal()}>
                        Отмена
                    </Button>
                </div>
            </Modal>
        );
    }
}
