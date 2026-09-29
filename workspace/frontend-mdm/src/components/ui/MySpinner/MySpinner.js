import React, { Component } from 'react';
import { Spinner } from 'react-bootstrap';

import styles from './MySpinner.module.css';

class MySpinner extends Component {
    render() {
        return (
            <Spinner
                className={`${styles['my-spinner']} ${this.props.className}`}
                style={{ height: this.props.size ? this.props.size : 25, width: this.props.size ? this.props.size : 25 }}
                animation="border"
            />
        );
    }
}

export default MySpinner;
