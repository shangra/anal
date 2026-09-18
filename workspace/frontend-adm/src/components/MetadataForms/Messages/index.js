import { Component } from 'react';
import HooksManager from 'helpers/lite-react-hooks';

export class Messages extends Component {
    constructor(props) {
        super(props);

        this.selectGlobalKey = `asyncApi`;
        this.selectLocalKey = `${this.selectGlobalKey}__Messages`;

        this.state = {
            message: undefined,
            messages: [],
        };
    }

    onApiReqest = (hook) => {
        const data = structuredClone(hook.asyncApi.res.data);
        if (data.message !== this.state.message)
            this.setState({ message: data.message, messages: [...this.state.messages, data.message] });
    };

    componentDidMount() {
        HooksManager.subscribeHook({
            [this.selectGlobalKey]: {
                [this.selectLocalKey]: this.onApiReqest,
            },
        });
    };

    componentWillUnmount() {
        HooksManager.unsubscribeHook({
            [this.selectGlobalKey]: [this.selectLocalKey],
        });
    };

    render() {
        return (
            <div>
                {this.state.message &&
                    this.state.messages.map((message, index) => (
                            <div key={index}>
                                {index + 1}: {message}
                                <br />
                            </div>
                        ))}
            </div>
        );
    }
}
