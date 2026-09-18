import StateManager from 'lite-react-statemanager';

const $modal = {
    show: (title, content, options = undefined, callback = undefined) => {
        StateManager.setState({
            modal: {
                show: true,
                element: {
                    name: title,
                    buttons: options?.buttons,
                    callback,
                },
                size: options?.size,
                isHideCloseButton: options?.isHideCloseButton,
                zIndex: options?.zIndex,
                fullscreen: options?.fullscreen,
                hideWhenClickBackdrop: options?.hideWhenClickBackdrop,
                content,
                scrollable: options?.scrollable,
            },
        });
    },
    hide: (callback) => {
        StateManager.setState({
            modal: {
                show: false,
                element: {
                    callback,
                },
            },
        });
    },
};

export default $modal;
