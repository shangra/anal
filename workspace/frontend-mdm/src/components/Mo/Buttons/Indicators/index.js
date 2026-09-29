import { Button, NumberIcon } from 'ui-kit';
import { General } from '../../../MetadataForms/Buttons/General';//'../General';
import $api from '../../../../helpers/axios';

export class Indicators extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Рассчитать метрики';
        this.title = this.props?.title ?? 'Рассчитать метрики';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('INDICATORS');
    }

    onClick = (e) => {
        e.stopPropagation();        
        const url = `/metadata/calculation-indicators/calculate`;
        $api.post(url);
    };

    // calculateDisableState = (selectedRows) => {
    //     return selectedRows?.length === 0;
    // }

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={NumberIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="primary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}