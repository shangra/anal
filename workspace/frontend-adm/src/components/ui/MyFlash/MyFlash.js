import { Component } from 'react';
import style from './MyFlash.module.css';
import StateManager from 'lite-react-statemanager';
import cn from 'classnames';

export class MyFlash extends Component {
    constructor(props) {
        super(props);

        this.state = {
            show: true,
            content: '',
            timer: '',
            style: {},
            className: '',
        };
        this.subFlashState = this.subFlashState.bind(this);
        this.closeHandler = this.closeHandler.bind(this);
    }

    componentDidMount() {
        StateManager.subscribeState({ flash: { subFlashState: this.subFlashState } });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ flash: ['subFlashState'] });
        clearTimeout(this.state.timer);
    }

    // ----------------------------

    subFlashState(store) {
        this.setState(store.flash);
        clearTimeout(this.state.timer);
        const timer = setTimeout(() => this.closeHandler(), 3500);
        this.setState({ timer });
    }

    closeHandler() {
        this.setState({ show: false });
        StateManager.setState({
            flash: {},
        });
        clearTimeout(this.state.timer);
    }

    render() {
        return (
            <div className="d-flex justify-content-center myflash">
                {this.state.show && (
                    <div className={cn('p-2', this.state.className, style.flash)} style={this.state.style}>
                        <div className="text-center me-4">{this.state.content}</div>
                        <i onClick={this.closeHandler} className={cn('bi bi-x fs-2', style.closeButton)} />
                    </div>
                )}
            </div>
        );
    }
}
