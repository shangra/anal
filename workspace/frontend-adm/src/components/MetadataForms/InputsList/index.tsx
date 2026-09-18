import { Component, ReactNode } from 'react';
import styles from './InputsList.module.css';

interface IInputsListProps {
    children: ReactNode[];
}

interface IInputsListState {}

export class InputsList extends Component<IInputsListProps, IInputsListState> {
    constructor(props: IInputsListProps) {
        super(props);
    }

    render() {
        return <div className={styles.wrapper}>{this.props.children}</div>;
    }
}
