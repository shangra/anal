import { Component } from 'react';

export const FULLSCREEN_CONTAINER_ID = 'fullscreen-container';
export class FullScreenContainer extends Component {
    render() {
        return <div id={FULLSCREEN_CONTAINER_ID} />;
    }
}
