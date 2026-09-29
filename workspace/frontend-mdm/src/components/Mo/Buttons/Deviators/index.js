import { Button, CalculateIcon } from 'ui-kit';
import { EditIcon } from '../../../MetadataForms/Icons/edit.icon';//'../../Icons/edit.icon.js';
import { General } from '../../../MetadataForms/Buttons/General';//'../General';
import $api from '../../../../helpers/axios';

export class Deviators extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Рассчитать отклонение';
        this.title = this.props?.title ?? 'Рассчитать отклонение';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('DEVIATORS');
    }

    onClick = (e) => {
        e.stopPropagation();
        const rows = this.DataManager?.selectedRows ?? [];
        
        const ids = [];
        rows.map(row=>{            
            ids.push(row.id);
        })

        const body = { ids };
        const url = `/metadata/calc-deviators/`;
        console.log("url, body", url, body)
        $api.post(url, body);

    };

    // calculateDisableState = (selectedRows) => {
    //     return !selectedRows || selectedRows.length !== 1;
    // }

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={CalculateIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="primary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}