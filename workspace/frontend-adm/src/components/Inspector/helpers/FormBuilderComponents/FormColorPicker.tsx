import { Component, createRef, type ChangeEvent } from 'react';
import { ColorPicker, EditIcon, Input, type ColorPickerProps } from 'ui-kit';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';

type ColorPickerTab = NonNullable<ColorPickerProps['tabs']>[number];

interface IFormColorData {
    name: string;
    description?: string;
    default?: string | null;
    showAlpha?: boolean;
    showRecent?: boolean;
    tabs?: ColorPickerTab[];
}

interface IFormColorPickerProps {
    data: IFormColorData;
    value?: string | null;
    forceValue?: string | null;
    onChange: (name: string, value: string | null) => void;
    disabled?: boolean;
}

interface IFormColorPickerState {
    value: string | null;
}
export class FormColorPicker extends Component<IFormColorPickerProps, IFormColorPickerState> {
    private triggerRef = createRef<HTMLDivElement>();

    constructor(props: IFormColorPickerProps) {
        super(props);

        const initial: string | null =
            props.forceValue !== undefined ? props.forceValue ?? null : props.value ?? props.data?.default ?? null;

        this.state = { value: initial };
    }

    componentDidMount() {
        this.props.onChange(this.props.data.name, this.state.value);
    }

    componentDidUpdate(prevProps: IFormColorPickerProps) {
        if (prevProps.value !== this.props.value) {
            this.setState({ value: this.props.value ?? null });
        }
    }

    handlePickerChange = (colorValue: string | null) => {
        this.setState({ value: colorValue });
        this.props.onChange(this.props.data.name, colorValue);
    };

    handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        // обновляем только локальный стейт — наружу не эмитим
        this.setState({ value: e.target.value || null });
    };

    handleInputBlur = () => {
        const { value } = this.state;
        const isValidHex = Boolean(value && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value));
        const emitValue = isValidHex ? value : null;
        this.setState({ value: emitValue });
        this.props.onChange(this.props.data.name, emitValue);
    };

    handlePencilClick = () => {
        this.triggerRef.current?.click();
    };

    render() {
        const { data } = this.props;
        const { value } = this.state;

        const tabs = data.tabs ?? (['grid', 'spectrum'] as ColorPickerTab[]);
        const showAlpha = data.showAlpha ?? true;
        const showRecent = data.showRecent ?? true;

        return (
            <FormInputWrapper description={data.description}>
                <ColorPicker
                    value={value}
                    onChange={this.handlePickerChange}
                    tabs={tabs}
                    showAlpha={showAlpha}
                    showRecent={showRecent}
                    placement="bottom-start"
                >
                    <div ref={this.triggerRef} style={{ display: 'none' }} aria-hidden />
                </ColorPicker>

                <Input
                    value={value ?? ''}
                    placeholder={data.default ?? '#000000'}
                    fullWidth
                    rightIcon={EditIcon}
                    onClickRightIcon={this.handlePencilClick}
                    onChange={this.handleInputChange}
                    onBlur={this.handleInputBlur}
                    disabled={this.props.disabled}
                />
            </FormInputWrapper>
        );
    }
}
