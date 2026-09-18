import { Button, AccessLockIcon } from 'ui-kit';
import StateManager from 'lite-react-statemanager';
import { General } from '../General';

export class EditAccess extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента EditAccess обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Редактировать доступ';
        this.title = this.props?.title ?? 'Редактировать доступ';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
        };
        this.initState('EDIT_ACCESS');
    }

    // rls и table вычисляются на лету из актуального DataManager.metadata, т.к. метаданные
    // могут подгружаться асинхронно уже ПОСЛЕ монтирования кнопки. Фиксировать их в state
    // в конструкторе нельзя — кнопка навсегда осталась бы скрытой при поздней загрузке.

    // Источник истины — флаг `metadata.rls`, который backend-сервис `getMetadata`
    // (LevelClass.item -> itemRlsFlag) вычисляет как строгий boolean из `manifest.settings.rls`.
    // Если поле по какой-то причине не пришло (мутировано/устаревший кеш), подстраховываемся
    // чтением сырого `manifest.settings.rls`, допуская строковые значения "true"/"on"/"1".
    isRlsEnabled() {
        
        const meta = this.props?.DataManager?.metadata;
        if (meta?.rls === true) return true;
        const rawRls = meta?.manifest?.settings?.rls;
        return rawRls === true || rawRls === 'true' || rawRls === 'on' || rawRls === 1;
    }

    getTable() {
        return (
            this.props?.DataManager?.metadata?.manifest?.settings?.table ?? ''
        );
    }

    onClick = (e) => {
        e.stopPropagation();
        const { selectedRows } = this.props.DataManager;
        const selectedRow = selectedRows && selectedRows[0];

        if (!selectedRow) return;

        StateManager.setState({
            nodeAccess: {
                nodeId: selectedRow.id,
                server: selectedRow.server || 'mdm',
                tableName: this.getTable(),
            },
        });
    };

    calculateDisableState = (selectedRows) => !selectedRows || selectedRows.length !== 1;

    render() {
        if (!this.isRlsEnabled()) {
            return null;
        }

        return (
            <Button
                title={this.title}
                leftIcon={AccessLockIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="secondary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}
