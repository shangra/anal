import React from 'react';
import { Typography } from 'ui-kit';
import styles from './FormInputWrapper.module.css';

interface IFormInputWrapperProps {
    children: React.ReactNode;
    description?: string;
    required?: boolean;
}

export class FormInputWrapper extends React.Component<Readonly<IFormInputWrapperProps>, {}> {
    render() {
        const { description, required } = this.props;
        const displayText = required ? `${description ?? ''} *` : description;

        return (
            <div className={styles.formInput}>
                <Typography className={styles.formInputDescription}>{displayText}</Typography>
                {this.props.children}
            </div>
        );
    }
}
