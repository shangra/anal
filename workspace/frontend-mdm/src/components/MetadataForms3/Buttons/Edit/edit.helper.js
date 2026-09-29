// form.helper.js
import StateManager from 'lite-react-statemanager';
import { FormMetadata } from '../../../FormMetadata/index.js';
import { v4 as uuidv4 } from 'uuid';

const RECENT_TABLE_ID = 'recentTableId';

export const createEditForm = (dataManager) => {
    const id = dataManager?.metadata?.id;
    const primaryKey = dataManager?.primaryKey;
    const targets = dataManager.resolveSelectionTargets();
    // Edit работает по одной строке (N=1). Берём явный первый target без шумного selectedRows[0].
    const element = targets[0];
    const modalUUID = uuidv4();
    const description = dataManager?.metadata?.description;
    const selectedRow = dataManager?.selectedRows?.[0];
    const name =
        dataManager?.MasterMetadata?.list?.refs?.id?.[element] ??
        selectedRow?.name ??
        'Редактирование';

    StateManager.setState({ [RECENT_TABLE_ID]: dataManager.formId });

    return {
        title: `${name} (${description})`,
        content: (
            <FormMetadata
                id={id}
                type='element'
                element={element}
                payload={{
                    modalUUID,
                    parentModalUUID: dataManager?.modalUUID,
                }}
                primaryKey={primaryKey}
            />
        ),
        options: {
            uuid: modalUUID,
        },
    };
};
