import React from 'react';
import { PopConfirm } from 'ui-kit';

import style from './styles.module.css';

interface PopConfirmSaveSchemaProps {
    isOwnerEdit: boolean;
    onSave?: () => void;
    children: React.ReactElement;
}

export class PopConfirmSaveSchema extends React.Component<PopConfirmSaveSchemaProps> {
    onClickSave = () => {
        this.props?.onSave?.();
    };

    handleChildClick = () => {
        if (this.props.isOwnerEdit) {
            this.onClickSave();
        }
    };

    render() {
        const { isOwnerEdit, children } = this.props;

        if (isOwnerEdit) {
            return React.cloneElement(children, {
                onClick: this.handleChildClick,
            });
        }

        return (
            <PopConfirm
                className={style['custom-popover-class']}
                title="Сохранение схемы"
                content="Вы не являетесь владельцем данной схемы, точно хотите сохранить изменения?"
                rejectLabel="Нет"
                confirmLabel="Да"
                placement="left-end"
                closeOnOutsideClick
                onConfirm={this.onClickSave}
            >
                {children}
            </PopConfirm>
        );
    }
}
