import StateManager from 'lite-react-statemanager';
import { v4 as uuidv4 } from 'uuid';

const $windows = {
    open: (title, content, options = {}, callback = undefined) => {
        const uuid = uuidv4();
        StateManager.setState({
            windows: {
                key: options.uuid ?? uuid,
                title,
                style: { width: options.width ?? '600px', height: options.height ?? '350px' },
                content,
                callback,
                portal: options.portal,
            },
        });
    },
    close: (uuid, callback) => {
        if (uuid) {
            StateManager.setState({
                windows: {
                    key: uuid,
                    close: true,
                    callback,
                },
            });
        }
    },
};

export default $windows;
