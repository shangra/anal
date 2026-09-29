import React, { Component } from 'react';
import StateManager from 'lite-react-statemanager';
// import { confirmCallbackMDM } from './confirm';
import MyButton from '../MyButton/MyButton';
import style from "./confirm.module.css"


export class MyConfirmMDM extends Component {
    constructor(props) {
        super(props);

        this.show = this.props.show ?? false
        this.callback = this.props.callback;
        this.acceptConfirm = this.acceptConfirm.bind(this);
        this.rejectConfirm = this.rejectConfirm.bind(this);
    }

    //----------------------------------------------------

    acceptConfirm() {
        this.setState({show: false})
        StateManager.setState({ modal: { show: false } });
        this.callback(true);
    }

    rejectConfirm() {
        this.setState({show: false})
        StateManager.setState({ modal: { show: false } });
        this.callback(false);
    }

    render() {
        return (
            <div className={style.confirm} style={this.show? {display: 'flex'} : {display: 'none'}}>
                <MyButton style={{ width: 60 }} onClick={this.acceptConfirm}>
                    Да
                </MyButton>
                <MyButton style={{ width: 60 }} onClick={this.rejectConfirm}>
                    Нет
                </MyButton>
            </div>
        );
    }
}

// export default MyConfirmMDM;
