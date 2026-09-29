import React from 'react';
import style from './index.module.css';

interface ILoaderProps {
    loadingText?: string;
}

interface ILoaderState {
    dotsLoaderString: string;
}

export class SimpleLoader extends React.Component<ILoaderProps, ILoaderState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            dotsLoaderString: '.',
        };
    }

    intervalTimerId: NodeJS.Timer | null = null;

    componentDidMount() {
        this.intervalTimerId = setInterval(() => {
            if (this.state.dotsLoaderString === '...') {
                this.setState({ dotsLoaderString: '.' });
            } else {
                this.setState((prevState) => ({
                    dotsLoaderString: `${prevState.dotsLoaderString}.`,
                }));
            }
        }, 500);
    }

    componentWillUnmount() {
        if (this.intervalTimerId) {
            clearInterval(this.intervalTimerId);
        }
    }

    render() {
        return (
            <div key='loader' className={style.loader}>
                {`${this.props.loadingText || 'Loading'} ${
                    this.state.dotsLoaderString
                }`}
            </div>
        );
    }
}
