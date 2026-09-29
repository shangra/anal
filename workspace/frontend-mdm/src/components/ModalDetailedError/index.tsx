import React, { FC } from 'react';
import DropdownButton from "react-bootstrap/DropdownButton";
import $modal from '../ui/modal.helper';
import MyButton from '../ui/MyButton/MyButton';
import style from './style.module.css';

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
export const ModalDetailedError: FC<IModalDetailedErrorProps> = ({ errorStatus,  errors, errorStack, errorTitle }) => (
        <div className={style.errorModalContent}>
            <div className={style.mainContentInfo}>
                <h4>Описание</h4>

                <h6>{errorTitle}</h6>

                <h6>Статус: {errorStatus}</h6>
            </div>

            <div className={style.errorModalControllers}>
                <MyButton onClick={() => $modal.hide()} className="m-2" size="medium">
                    Скрыть
                </MyButton>

                <DropdownButton id="dropdown-basic-button" title="Подробнее">
                    <div className={style.errorModalAdditionalInfo}>
                        <span>Ошибки:</span>
                        <br />
                        {
                            errors?.map((errorText) => (
                                <>
                                    {errorText}
                                    <br />
                                </>
                            ))
                        }
                        <span>Stack:</span>
                        <br />
                        <span>{errorStack}</span>
                    </div>
                </DropdownButton>
            </div>
        </div>
    );