import StateManager from 'lite-react-statemanager';
import { FormMetadata } from 'components/FormMetadata';
import { v4 as uuidv4 } from 'uuid';

const RECENT_TABLE_ID = 'recentTableId';

export const createEditForm = (dataManager) => {
    const id = dataManager?.metadata?.id;
    const primaryKey = dataManager?.primaryKey;
    const element = dataManager.selectedRows.map(el => el.id)[0];
    const modalUUID = uuidv4();
    const description = dataManager?.metadata?.description;
    const name = dataManager?.MasterMetadata?.list?.refs?.id?.[element] ?? dataManager?.selectedRows[0]?.name ?? "Редактирование";

    StateManager.setState({ [RECENT_TABLE_ID]: dataManager.formId });

    return {
        title: `${name} (${description})`,
        content: (
            <FormMetadata
                id={id}
                type="element"
                element={element}
                server={dataManager?.server}
                payload={{
                    modalUUID,
                    parentModalUUID: dataManager?.modalUUID,
                }}
                primaryKey={primaryKey}
            />
        ),
        options: {
            uuid: modalUUID,
        }
    };
};