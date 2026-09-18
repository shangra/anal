import { size } from '@floating-ui/react';
import { Component } from 'react';
import { Button as ButtonComponent, ButtonProps as ButtonComponentProps } from "ui-kit";
import { BUTTON_VARIANT, BUTTON_TYPE, BUTTON_COLOR, BUTTON_SIZE } from 'ui-kit';
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

export class Button extends Component<ButtonComponentProps> {
    static constructorSettings = {
        name: 'Кнопка',
        description: 'Кнопка',
        propsData: {
            // leftIcon,
            // rightIcon,
            children: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Текст кнопки',
            },
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Во всю ширину',
            },
            disabled: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Неактивная',
            },
            loading: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Загрузка',
            },
            rounded: { 
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Скругление',
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
            type: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Тип кнопки',
                propVariants: [
                    { label: 'button', value: BUTTON_TYPE.BUTTON },
                    { label: 'submit', value: BUTTON_TYPE.SUBMIT },
                    { label: 'reset', value: BUTTON_TYPE.RESET },
                ],
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
                propTitle: 'Функция при уводе курсора',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
        },
    };
    render = () => (
        <ButtonComponent {...this.props}/>
    )
}

export type ButtonProps = ButtonComponentProps