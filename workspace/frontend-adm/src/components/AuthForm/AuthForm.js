import StateManager from 'lite-react-statemanager';
import { Component } from 'react';
import { Button, Input } from 'ui-kit';

import $api from 'helpers/axios';
import { withRouter } from 'components/HOC/withRouter';
import styles from './AuthForm.module.css';

class AuthForm extends Component {
    constructor() {
        super();
        this.state = {
            password: '',
            login: '',
            error: null,
        };
        this.submitHandler = this.submitHandler.bind(this);
        this.changeHandler = this.changeHandler.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }

    //------------------------------------

    changeHandler(e) {
        this.setState({
            [e.target.name]: e.target.value,
            error: null,
        });
    }

    handleCancel() {
        StateManager.setState({ modal: { show: false } });
    }

    submitHandler(e) {
        e.preventDefault();

        const { login, password } = this.state;
        const { device } = StateManager.state;

        $api.post(StateManager.state.modal.element.control?.link ?? '/auth/login', { login, password, device })
            .then((res) => {
                StateManager.setState({
                    user: res.data,
                    modal: { show: false },
                });
                window.location.reload();
            })
            .catch((error) => {
                this.setState({
                    error: error.response?.data?.message || 'Ошибка авторизации',
                });
            });
    }

    isLoginError() {
        const { error } = this.state;
        return error && error.includes('логин') ? error : null;
    }

    isPasswordError() {
        const { error } = this.state;
        return error && error.includes('пароль') ? error : null;
    }

    render() {
        const { login, password } = this.state;
        const loginError = this.isLoginError();
        const passwordError = this.isPasswordError();

        return (
            <form className={styles.form} onSubmit={this.submitHandler}>
                <div className={styles.inputGroup}>
                    Логин
                    <Input
                        name="login"
                        value={login}
                        placeholder="Введите логин"
                        onChange={this.changeHandler}
                        variant="contained"
                        rounded
                        fullWidth
                        hint={loginError}
                        status={loginError ? 'error' : null}
                    />
                </div>

                <div className={styles.inputGroup}>
                    Пароль
                    <Input
                        name="password"
                        value={password}
                        placeholder="Введите пароль"
                        onChange={this.changeHandler}
                        variant="contained"
                        rounded
                        fullWidth
                        type="password"
                        hint={passwordError}
                        status={passwordError ? 'error' : null}
                    />
                </div>

                <div className={styles.buttonsContainer}>
                    <Button variant="outlined" color="secondary" size="medium" onClick={this.handleCancel} type="button">
                        Отмена
                    </Button>
                    <Button variant="contained" color="primary" size="medium" type="submit">
                        Войти
                    </Button>
                </div>
            </form>
        );
    }
}

export default withRouter(AuthForm);
