import React, { Component, ReactNode } from 'react';
import styles from './Container.module.css';

interface IContainerProps {
    children: ReactNode[];
}

interface IContainerState {}

export class Container extends Component<IContainerProps, IContainerState> {
    constructor(props: IContainerProps) {
        super(props);
    }

    render() {
        return <div className={styles.container}>{this.props.children}</div>;
    }
}
