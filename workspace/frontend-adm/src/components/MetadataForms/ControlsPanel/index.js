import React, { Component } from 'react';
import style from './control.module.css';

export class ControlsPanel extends Component {
    constructor(props) {
        super(props);

        this.state = {
            align: this.props?.align?.toLowerCase() ?? '',
        };
    }

    render() {
        return (
            <div
                className={style.ControlPanel}
                style={{
                    justifyContent: this.state.align === 'справа' ? 'flex-end' : 'flex-start',
                }}
            >
                {this.props.children}
            </div>
        );
    }
}
