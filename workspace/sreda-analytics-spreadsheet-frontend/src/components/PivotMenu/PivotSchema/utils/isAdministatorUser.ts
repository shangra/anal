import StateManager from 'lite-react-statemanager';

const ADMINISTRATOR_ID = '12e32c9d-6e4f-4d57-ae22-5cddaabf343c';
const METADATA_ADMINISTRATOR_ID = '79ac697d-2559-4a43-8279-bf12fc1c4ffc';

export const isAdministratorUser = () => {
    const userRules = StateManager.state.user.rules || {};

    return ADMINISTRATOR_ID in userRules || METADATA_ADMINISTRATOR_ID in userRules;
};
