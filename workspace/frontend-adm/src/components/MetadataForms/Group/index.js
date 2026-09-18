import React, { Component } from 'react';
import style from './group.module.css';

export class Group extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <div className={style.Group}>{this.props.children}</div>;
    }
}
