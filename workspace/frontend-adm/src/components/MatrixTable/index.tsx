import { Tabs, Tab } from 'ui-kit';
import style from './matrix.module.css';
import { Component, ReactNode } from 'react';
import { MTable } from 'components/MatrixTable/components/MTable';

export class MatrixTable extends Component<Record<string, unknown>, Record<string, unknown>> {
    constructor(props: Record<string, unknown>) {
        super(props);
        this.state = {};
    }

    render(): ReactNode {
        return (
            <div className={style.root}>
                <Tabs className={style.test}>
                    <Tab label="Роли и права">
                        <MTable
                            key="rolerule"
                            entity="rolerule"
                            name="Роли и права"
                            columnsKey="AllRulesObject"
                            rowsKey="AllRolesObject"
                            resourceName="roles"
                            idField="rule_id"
                            togglePath="rules"
                        />
                    </Tab>
                    <Tab label="Пользователи и роли">
                        <MTable
                            key="userrole"
                            entity="userrole"
                            name="Пользователи и роли"
                            columnsKey="AllRolesObject"
                            rowsKey="AllUsersObject"
                            resourceName="users"
                            idField="role_id"
                            togglePath="roles"
                        />
                    </Tab>
                    <Tab label="Пользователи и Группы">
                        <MTable
                            key="usergroup"
                            entity="usergroup"
                            name="Пользователи и Группы"
                            columnsKey="AllGroupsObject"
                            rowsKey="AllUsersObject"
                            resourceName="users"
                            idField="group_id"
                            togglePath="groups"
                        />
                    </Tab>
                    <Tab label="Пользователи и Права">
                        <MTable
                            key="userrule"
                            entity="userrule"
                            name="Пользователи и Права"
                            columnsKey="AllRulesObject"
                            rowsKey="AllUsersObject"
                            resourceName="users"
                            idField="rule_id"
                            togglePath="rules"
                        />
                    </Tab>
                </Tabs>
            </div>
        );
    }
}
