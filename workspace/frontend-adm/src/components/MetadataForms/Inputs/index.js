import React, { Component } from 'react';
import { ErrorBoundary } from 'components/ErrorBoundary';

export class Inputs extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <ErrorBoundary
                fallbackUI={(error) => (
                    <div>
                        <b>Произошла ошибка в CommonInput:</b> {error}
                    </div>
                )}
            >
                <div>Inputs</div>
            </ErrorBoundary>
        );
    }
}

/** *
 * Доска с задачей на CommonInput
 * https://whiteboard.sberbank.ru/b/defe1117-3c93-4102-9774-498d6cd2c784
 *
 */
