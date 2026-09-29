import React, { type ChangeEvent } from 'react';
import $api from '../../../../helpers/axios';
import { CommonInput } from '../../../CommonInput';
import type {
    DefaultInputOptionalPropsType,
    DefaultInputRequiredPropsType,
} from './types';

export interface IBlobInputProps
    extends DefaultInputRequiredPropsType<string | null> {}

interface IBlobInputOptionalProps extends DefaultInputOptionalPropsType {}

interface IBlobInputState {
    value: string | null;
    name: string;
    ext: string;
}

export type BlobInputPropsType = Readonly<
    IBlobInputProps & IBlobInputOptionalProps
>;

export class BlobInput extends React.Component<
    BlobInputPropsType,
    IBlobInputState
> {
    constructor(props: BlobInputPropsType) {
        super(props);

        this.state = {
            value: this.props.value ?? null,
            name: '',
            ext: '',
        };
    }

    componentDidMount() {
        if (!this.state.value) return;
        this.fetchFileInfo(this.state.value);
    }

    componentDidUpdate(
        prevProps: Readonly<BlobInputPropsType>,
        prevState: Readonly<IBlobInputState>
    ) {
        if (prevState.value !== this.props.value) {
            this.setState({ value: this.props.value });

            this.fetchFileInfo(this.props.value ?? ''!);
        }
    }

    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: e.target.value });
        this.props.onChange?.(e.target.value);
    };

    onClear = () => {
        this.setState({
            value: null,
            name: '',
            ext: '',
        });
        this.props.onChange?.(null);
    };

    /**
     * Получение информации о файле
     * @param {string} uuid
     */
    fetchFileInfo = (uuid: string) => {
        const uuidRegex =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(this.state.value ?? '')) return;

        $api.get(`/files/get/${uuid}`)
            .then((res) => {
                const { name, ext } = res.data;
                this.setState({ name, ext });
            })
            .catch((err) => {
                throw new Error(
                    `Ошибка при получении информации о файле ${err}`
                );
            });
    };

    onClick = () => {
        const { value: uuid } = this.props;
        const { name, ext } = this.state;

        window.open(`/api/files/get/${uuid}/${name}${ext}`, '_blank');
    };

    render() {
        const { value } = this.props;
        const { name, ext } = this.state;

        const fullName = ext
            ? name + ext
            : this.props.value
            ? `Не удалось определить название файла с uuid ${value}`
            : `Не передан uuid файла`;

        return (
            <CommonInput
                openButton={!!ext}
                value={fullName}
                type='text'
                fullWidth
                onChange={() => {}}
                onClear={this.onClear}
                onClickOpen={this.onClick}
            />
        );
    }
}
