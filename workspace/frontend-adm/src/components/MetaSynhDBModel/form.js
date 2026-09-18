import { Component } from 'react';
import $api from 'helpers/axios';
import $modal from 'components/ui/MyModal/modal.helper';
import { Button, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, Tab, Tabs, Stack } from 'ui-kit';
import { buildUrl } from 'helpers/buildUrl';

export class FormSync extends Component {
    constructor(props) {
        super(props);

        const tables = this.getModels(props.data);

        this.state = {
            tables: props.data ? tables : {},
        };

        this.synchModel = this.synchModel.bind(this);
        this.dropModel = this.dropModel.bind(this);
        this.checkValue = this.checkValue.bind(this);
    }

    dropModel() {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.delete(url).then(() => {
            $modal.hide();
        });
    }

    synchModel() {
        const { server, service } = this.props;
        const url = buildUrl(server, service);
        $api.post(url, this.state.tables).then(() => {
            $modal.hide();
        });
    }

    checkValue(e, type, fieldName) {
        const value = e;
        this.setState((prevState) => {
            const table = { ...prevState.table };
            table[type] = table[type] ?? {};
            table[type][fieldName] = table[type][fieldName] ?? {};
            if (value) {
                table[type][fieldName] = value;
            } else {
                delete table[type][fieldName];
            }
            return { table };
        });
    }

    getModels = (data) => {
        const result = {};
        for (const tableName in data) {
            result[tableName] = this.getModel(data[tableName]); // { model, table }
        }
        return result;
    };

    getModel = (data) => {
        const model = [];
        const table = {
            insert: {},
            update: {},
            delete: {},
        };

        for (const fieldName of data.allFields) {
            const record = {};

            const fieldDelete = Object.keys(data.deleteFields).includes(fieldName);
            const fieldUpdate = Object.keys(data.updateFields).includes(fieldName);
            const fieldInsert = Object.keys(data.insertFields).includes(fieldName);

            record.field = fieldName;
            record.inSchema = data.inSchema.includes(fieldName);
            record.inDB = data.inDB.includes(fieldName);
            record.delete = fieldDelete;
            record.update = fieldUpdate;
            record.insert = fieldInsert;

            if (fieldDelete) table.delete[fieldName] = true;
            if (fieldUpdate) table.update[fieldName] = data.updateFields[fieldName];
            if (fieldInsert) table.insert[fieldName] = true;

            model.push(record);
        }

        return { model, table };
    };

    componentDidUpdate(prevProps) {
        if (JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)) {
            const tables = this.getModels(this.props.data);
            this.setState({ tables });
        }
    }

    render() {
        const TablesJSX = [];
        for (const tableName in this.state.tables) {
            const tbody = this.state.tables[tableName].model.map((record) => (
                <TableRow key={record.field}>
                    <TableCell>
                        <b>{record.field}</b>
                    </TableCell>
                    <TableCell>
                        <Checkbox checked={record.inSchema} readOnly />
                    </TableCell>
                    <TableCell>
                        <Checkbox checked={record.inDB} readOnly />
                    </TableCell>
                    <TableCell>
                        {record.delete ? (
                            <Checkbox
                                checked={record.delete}
                                onChange={(e) => {
                                    this.checkValue(e, 'delete', record.field);
                                }}
                            />
                        ) : (
                            <Checkbox checked={record.delete} readOnly />
                        )}
                    </TableCell>
                    <TableCell>
                        <Checkbox checked={record.update ?? false} readOnly />
                    </TableCell>
                    <TableCell>
                        <Checkbox checked={record.insert ?? false} readOnly />
                    </TableCell>
                </TableRow>
            ));

            TablesJSX.push(
                <Tab label={tableName}>
                    <Table hasHovered hasFocused>
                        <TableHead>
                            <TableRow>
                                <TableCell>Поле</TableCell>
                                <TableCell>В схеме</TableCell>
                                <TableCell>В БД</TableCell>
                                <TableCell>Удалить</TableCell>
                                <TableCell>Изменить</TableCell>
                                <TableCell>Добавить</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{tbody}</TableBody>
                    </Table>
                </Tab>,
            );
        }

        return (
            <div>
                <Tabs style={{ marginBottom: '10px' }} variant="rounded">
                    {TablesJSX}
                </Tabs>
                <Stack direction="row" justifyContent="space-between" gap="10px">
                    <Button onClick={this.synchModel}>Синхронизировать</Button>
                    <Button onClick={this.dropModel}>Удалить таблицу</Button>
                </Stack>
            </div>
        );
    }
}
