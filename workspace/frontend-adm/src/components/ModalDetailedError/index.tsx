import React, { FC } from 'react';
import $modal from 'components/ui/MyModal/modal.helper';
import style from './style.module.css';
import { BottomIcon, Button, Popover } from 'ui-kit';

interface IModalDetailedErrorProps {
    errorStatus: number;
    errors: string[];
    errorStack: string;
    errorTitle?: string;
}

/**
 * Компонент подробного описания ошибки
 * errorStatus - статус-код запроса
 * errors - массив ошибок
 * errorStack - error stack-trace
 */
export const ModalDetailedError: FC<IModalDetailedErrorProps> = ({ errorStatus, errors, errorStack, errorTitle }) => (
    <div className={style.errorModalContent}>
        <div className={style.mainContentInfo}>
            <h4>Описание</h4>

            <h6>{errorTitle}</h6>

            <h6>Статус: {errorStatus}</h6>
        </div>

        <div className={style.errorModalControllers}>
            <Button onClick={() => $modal.hide()} size="medium">
                Скрыть
            </Button>

            <Popover
                content={
                    <div className={style.errorModalAdditionalInfo}>
                        <span>Ошибки:</span>
                        <br />
                        {errors?.map((errorText) => (
                            <>
                                {errorText}
                                <br />
                            </>
                        ))}
                        <span>Stack:</span>
                        <br />
                        <span>{errorStack}</span>
                    </div>
                }
            >
                <Button size="medium" rightIcon={BottomIcon}>
                    Подробнее
                </Button>
            </Popover>
        </div>
    </div>
);
