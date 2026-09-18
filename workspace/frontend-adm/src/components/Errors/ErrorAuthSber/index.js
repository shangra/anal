import { PureComponent } from 'react';

import style from './errorAuthSber.module.css';
import imgInfo1 from './images/1.png';
import imgInfo2 from './images/2.png';

class ErrorAuthSber extends PureComponent {
    render() {
        return (
            <div className={`DesktopContainer ${style.error}`}>
                <h1 className="pb-4">Ошибка доступа</h1>
                <div className="pb-2">
                    Оформить доступ к информационному ресурсу DR-Портал необходимо через
                    <a
                        className={`${style.link} ps-2`}
                        href="https://sberfriend.ca.sbrf.ru/sberfriend/#/application/D3319AAB60723D7EE053F7E9740A471A"
                        target="_blank"
                        rel="noreferrer"
                    >
                        АС СберДруг
                    </a>
                </div>
                <div className="pb-4">Шаблон «Универсальная заявка на доступ к АС»</div>
                <div className="pb-2">Обязательные поля для заполнения:</div>
                <ul className={style.ul}>
                    <li className={style.li}>
                        <i className="bi bi-check-lg pe-2" />
                        «Автоматизированная система» – DR Portal
                    </li>
                    <li className={style.li}>
                        <i className="bi bi-check-lg pe-2" />
                        «Полномочия» – Пользователь DR-Портала
                    </li>
                </ul>
                <div className={style.images}>
                    <img src={imgInfo1} className={style.img} />
                    <img src={imgInfo2} className={style.img} />
                </div>
            </div>
        );
    }
}

export default ErrorAuthSber;
