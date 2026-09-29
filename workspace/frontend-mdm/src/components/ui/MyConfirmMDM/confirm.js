import StateManager from 'lite-react-statemanager';
import { MyConfirmMDM } from './index.js';

export let confirmCallbackMDM;

export default confirm = (text, cb) => {
    StateManager.setState({
        modal: {
            show: true,
            element: {
                name: text,
            },
            content: <MyConfirmMDM callback={cb} show={true}/>
        },
    });
    // return new Promise((resolve) => {
    //     confirmCallbackMDM = resolve;
    // });
}
