import { Component } from 'react';
import HooksManager from 'helpers/lite-react-hooks';
import {SELECTED_ROWS_HOOK_NAME} from 'components/MetadataForms/ElementsList/constants';

export class General extends Component {

    constructor(props) {
        super(props);
    }

    initState(BUTTON) {
        this.selectGlobalKey = `${this.props.DataManager.modalUUID}__${this.formId}__SELECT`;
        this.selectLocalKey = `${this.selectGlobalKey}__${BUTTON}`;
    }
    
    componentDidMount() {
        HooksManager.subscribeHook({
            [this.selectGlobalKey]: {
                [this.selectLocalKey]: this.onChangeListState,
            },
        });
    };

    componentWillUnmount() {
        HooksManager.unsubscribeHook({
            [this.selectGlobalKey]: [this.selectLocalKey],
        });
    };

    onChangeListState = (subscribe) => {
        const selectedRows = subscribe[this.selectGlobalKey]?.[SELECTED_ROWS_HOOK_NAME];
        
        const disable = this.calculateDisableState(selectedRows);
        
        this.setState({ disable });
    };

    calculateDisableState = (selectedRows) => !selectedRows || selectedRows.length === 0;
}
