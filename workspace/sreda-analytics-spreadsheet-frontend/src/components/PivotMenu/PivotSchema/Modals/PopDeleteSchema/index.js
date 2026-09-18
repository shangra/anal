import React from 'react';
import { PopConfirm } from 'ui-kit';

import style from './styles.module.css';

export class PopDeleteSchema extends React.Component {
    onClickDelete = () => {
        this.props?.onDelete?.();
    };

    render() {
        return (
            <PopConfirm
                className={`${style['custom-popover-class']}`}
                title="Удаление схемы"
                content="Вы точно хотите удалить схему?"
                rejectLabel="Нет"
                confirmLabel="Да"
                placement="top"
                closeOnOutsideClick
                onConfirm={this.onClickDelete}
            >
                {this.props.children}
            </PopConfirm>
        );
    }
}
