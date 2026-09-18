import StateManager from 'lite-react-statemanager';

const $message = {
    show: (content: string) => {
        StateManager.setState({
            flash: {
                show: true,
                content,
            },
        });
    },
};

export default $message;
