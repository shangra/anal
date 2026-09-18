import { Component } from 'react';
import {
    Dropdown as DropdownComponent,
    DropdownProps as DropdownComponentProps,
    BUTTON_COLOR,
    BUTTON_SIZE,
    BUTTON_VARIANT
} from "ui-kit";
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

export class Dropdown extends Component<DropdownComponentProps> {
    static constructorSettings = {
        name: 'Выпадающее меню',
        description: 'Выпадющее меню',
        propsData: {
            // options=[],
            // leftIcon,
            children: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Текст кнопки',
            },
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Во всю ширину',
            },
            rounded: { 
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Скругление',
            },
            placement: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'controlled', value: BUTTON_COLOR.CONTROLLED},
                    {label: 'erron', value: BUTTON_COLOR.ERROR},
                    {label: 'primary', value: BUTTON_COLOR.PRIMARY},
                    {label: 'secondary', value: BUTTON_COLOR.SECONDARY},
                    {label: 'success', value: BUTTON_COLOR.SUCCESS},
                    {label: 'warning', value: BUTTON_COLOR.WARNING},
                ]
            },
            color:{
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'controlled', value: BUTTON_COLOR.CONTROLLED},
                    {label: 'erron', value: BUTTON_COLOR.ERROR},
                    {label: 'primary', value: BUTTON_COLOR.PRIMARY},
                    {label: 'secondary', value: BUTTON_COLOR.SECONDARY},
                    {label: 'success', value: BUTTON_COLOR.SUCCESS},
                    {label: 'warning', value: BUTTON_COLOR.WARNING},
                ]
            },
            size: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Размер',
                propVariants: [
                    {label: 'large', value: BUTTON_SIZE.LARGE},
                    {label: 'medium', value: BUTTON_SIZE.MEDIUM},
                    {label: 'small', value: BUTTON_SIZE.SMALL},
                ],
            },
            variant: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Вариант',
                propVariants: [
                    { label: 'outlined', value: BUTTON_VARIANT.OUTLINED },
                    { label: 'contained', value: BUTTON_VARIANT.CONTAINED },
                    { label: 'text', value: BUTTON_VARIANT.TEXT },
                ],
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
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
            onDoubleClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по двойному клику',
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
                propTitle: 'Функция при уводу курсора',
            },
        },
    };
    render = () => (
        <DropdownComponent {...this.props} />
    )
}

export type DropdownProps = DropdownComponentProps