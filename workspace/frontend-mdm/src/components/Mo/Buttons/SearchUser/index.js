import { Button, CollaborationIcon, Input } from 'ui-kit';
import { General } from '../../../MetadataForms/Buttons/General';
import $api from '../../../../helpers/axios';
import $modal from '../../../ui/modal.helper.js';

export class SearchUser extends General {
    constructor(props) {
        super(props);

        this.DataManager = this.props?.DataManager ?? {};
        if (!this.props?.DataManager) console.error('Для работы компонента Add обязателен параметр DataManager!');

        this.formId = this.DataManager.formId;
        this.description = this.props?.description ?? 'Проверить эскалацию';
        this.title = this.props?.title ?? 'Проверить эскалацию';

        this.state = {
            element: undefined,
            disable: true,
            type: this.props.type ?? 'icon',
            userId: ''
        };
        this.initState('SEARCHUSER');
    }

    onClick = (e) => {        
        e.stopPropagation();

        const rows = this.DataManager?.selectedRows ?? [];
        const ids = rows.map(row=>row.id);

        $modal.show(
            "Введите id проверяющего пользователя",
            (<div>
                <Input value={this.state.userId} onChange={(e)=>{
                        const val = e.nativeEvent.target.value;
                        this.setState({userId: val});
                        console.log("rrrrr", val)
                    }}/>
                <Button color="primary" onClick={()=>{this.onClickSearch(ids)}}> Проверить </Button>
            </div>)
        )
    };

    onClickSearch = (metricids) => {
        const userid = this.state.userId;
        const url = `/to/mdm/searchuser/${metricids[0]}/${userid}`;
        $api.get(url)
            .then(res=>{
                $modal.show(
                    "Результат проверки",
                    (<div>На данного пользователя есть эскалация</div>)
                );
            })
            .catch(res=>{
                $modal.show(
                    "Результат проверки",
                    (<div>Этот пользователь в эскалации не участвует</div>)
                );
            })
    }

    render() {
        return (
            <Button
                title={this.title}
                leftIcon={CollaborationIcon}
                onClick={this.onClick}
                disabled={this.state.disable}
                color="primary"
            >
                {this.state.type !== 'icon' ? this.description : ''}
            </Button>
        );
    }
}