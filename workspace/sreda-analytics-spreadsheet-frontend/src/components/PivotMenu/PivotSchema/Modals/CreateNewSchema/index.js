import React, { Component } from 'react';
import { Button, Checkbox, Input, Modal, Typography } from 'ui-kit';

import { normalizeSpaces } from '../../utils/index';
import style from './styles.module.css';

export class CreateNewSchema extends Component {
    constructor(props) {
        super(props);

        const { name = '', forAll = false } = this.props.schemaInfo ?? {};
        this.state = {
            name,
            isLoading: false,
            inheritOptions: true,
            forAll,
        };
    }

    componentDidUpdate(prevProps) {
        if (JSON.stringify(this.props) !== JSON.stringify(prevProps)) {
            const { name = '', forAll = false } = this.props.schemaInfo ?? {};

            this.setState({ name, forAll, inheritOptions: true });
        }
    }

    handleChangeName = (e) => {
        const value = normalizeSpaces(e.target.value);
        this.setState({ name: value });
    };

    handleChangeforAll = (e) => {
        const targetValue = e.target.checked;
        this.setState({ forAll: targetValue });
    };

    saveSchema = () => {
        this.setState({ isLoading: true });
        const { createdUser, tableId } = this.props.schemaInfo;
        const { name, inheritOptions, forAll } = this.state;
        const cleanedName = normalizeSpaces(name).trim();

        this.props
            ?.onSave?.({ name: cleanedName, createdUser, tableId, standart: false, forAll }, inheritOptions)
            ?.finally(() => {
                this.setState({ isLoading: false, inheritOptions: true });
            });
    };

    render() {
        const { showForAll } = this.props;
        return (
            <Modal
                title="Новая схема"
                classNames={style.modal}
                opened={this.props.open}
                onSetOpen={(open) => this.props.onSetOpen(open)}
            >
                <div>
                    <div className={style.group}>
                        <Typography variant="subtitle1" style={{ marginBottom: 'var(--ui-kit-spacing-4)' }}>
                            Название
                        </Typography>
                        <Input
                            title="Название"
                            value={this.state.name}
                            onChange={this.handleChangeName}
                            style={{ width: '100%' }}
                            disabled={this.state.isLoading}
                        />
                    </div>
                    {showForAll && (
                        <div className={style.group}>
                            <Checkbox
                                label="Общедоступная схема"
                                checked={this.state.forAll}
                                value={this.state.forAll}
                                type="checkbox"
                                name="forAll"
                                onChange={this.handleChangeforAll}
                                disabled={this.state.isLoading}
                            />
                        </div>
                    )}
                    <div className={style.group}>
                        <Checkbox
                            label="Сохранить текущие изменения"
                            checked={this.state.inheritOptions}
                            onChange={(e) => {
                                this.setState({ inheritOptions: e.target.checked });
                            }}
                            style={{ width: '100%' }}
                            disabled={this.state.isLoading}
                        />
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginTop: 'var(--ui-kit-spacing-8)',
                    }}
                >
                    <Button
                        size="medium"
                        variant="outlined"
                        onClick={() => this.props.onSetOpen(false)}
                        disabled={this.state.isLoading}
                    >
                        Отменить
                    </Button>
                    <Button
                        size="medium"
                        variant="contained"
                        color="primary"
                        onClick={this.saveSchema}
                        disabled={this.state.isLoading || !normalizeSpaces(this.state.name).trim()}
                        loading={this.state.isSaving}
                    >
                        Сохранить
                    </Button>
                </div>
            </Modal>
        );
    }
}
