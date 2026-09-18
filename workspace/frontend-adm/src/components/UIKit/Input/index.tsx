import { Component } from 'react';
import { INPUT_STATUS, INPUT_TYPE, INPUT_VARIANT, Input as InputComponent, InputProps as InputComponentProps } from "ui-kit"
// import { FIELD_VARIANTS } from '../../FormConstructorAdapter/constants';
const FIELD_VARIANTS = {
    INPUT: 'input',
    TEXTAREA: 'textarea',
    NUMBER: 'number',
    CHECKBOX: 'checkbox',
    SELECT: 'select',
    PASSWORD: 'password',
    STYLE: 'style',
    FUNCTION: 'functions',
};

export class Input extends Component<InputComponentProps> {
    static constructorSettings = {
        name: 'Компонент ввода текста',
        description: 'Компонент ввода текста одной строкой',
        propsData: {
            // leftIcon: LeftIcon,
            // rightIcon: RightIcon,
            value: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Значение поля',
            },
            hint: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Подсказка',
            },
            variant: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Вариант',
                propVariants: [
                    { label: 'outlined', value: INPUT_VARIANT.OUTLINED },
                    { label: 'contained', value: INPUT_VARIANT.CONTAINED },
                ],
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            onDoubleClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по двойному клику',
            },
            prefix: {
                ontrolType: FIELD_VARIANTS.INPUT,
                propTitle: 'Prefix',
            },
            suffix: {
                ontrolType: FIELD_VARIANTS.INPUT,
                propTitle: 'Suffix',
            },
            placeholder: {
                ontrolType: FIELD_VARIANTS.INPUT,
                propTitle: 'Placeholder',
            },
            className: {
                ontrolType: FIELD_VARIANTS.INPUT,
            },
            name: {
                ontrolType: FIELD_VARIANTS.INPUT,
                propTitle: 'Имя',
            },
            status: {
               controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'erron', value:  INPUT_STATUS.ERROR},
                    {label: 'success', value:  INPUT_STATUS.SUCCESS},
                ] 
            },            
            readOnly: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Только для чтения',
            },
            disabled: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Неактивно',
            },
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Во всю ширину',
            },
            rounded: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Скругление',
            },
            type: {},
            onChange: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция на изменение выбора',
            },
            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
            },
            onBlur: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при потери фокуса',
            },
            onFocus: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при фокусе',
            },
            onMouseDown: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по нажатию мыши',
            },
            onMouseUp: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по отпусканию мыши',
            },
            onMouseEnter: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при наведении курсора',
            },
            onMouseLeave: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при уводе курсора',
            },
            onClickLeftIcon: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при клике по левой иконке',
            },
            onClickRightIcon: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при клике по правой иконке',
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
        },
    };
    render = () => (
        <InputComponent {...this.props} />
    )
    
}

export type InputProps = InputComponentProps