import { Component } from 'react';
import {
    Icon as IconComponent,
    IconProps as IconComponentUIProps,
    IconComponentProps as IconComponentComponentProps,
    ICON_COLOR,
    ICON_SIZE,
} from 'ui-kit';
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

export class Icon extends Component<IconComponentUIProps> {
    static constructorSettings = {
        slot: ["children"],
        name: 'Иконка',
        description: 'Иконка',
        propsData: {
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
            viewBox: {
                controlType: FIELD_VARIANTS.TEXTAREA,
                propTitle: 'testId',
            },
            height: {
                controlType: FIELD_VARIANTS.NUMBER,
                propTitle: 'Высота',
            },
            width: {
                controlType: FIELD_VARIANTS.NUMBER,
                propTitle: 'Ширина',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.TEXTAREA,
            },
            color:{
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'text', value: ICON_COLOR.TEXT},
                    {label: 'erron', value: ICON_COLOR.ERROR},
                    {label: 'primary', value: ICON_COLOR.PRIMARY},
                    {label: 'secondary', value: ICON_COLOR.SECONDARY},
                    {label: 'success', value: ICON_COLOR.SUCCESS},
                    {label: 'warning', value: ICON_COLOR.WARNING},
                    {label: 'icon', value: ICON_COLOR.ICON},
                    {label: 'white', value: ICON_COLOR.WHITE},
                ]
            },
            size: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Размер',
                propVariants: [
                    {label: 'xLarge', value: ICON_SIZE.X_LARGE},
                    {label: 'large', value: ICON_SIZE.LARGE},
                    {label: 'medium', value: ICON_SIZE.MEDIUM},
                    {label: 'small', value: ICON_SIZE.SMALL},
                    {label: 'xSmall', value: ICON_SIZE.X_SMALL},
                ],
            },

            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
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
            onPointerEnter: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при наведении указателя ввода',
            },
            onPointerLeave: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция при уводе указателя ввода',
            },
        },
    };

    render = () => (
        <IconComponent {...this.props} />
    )
}

export type IconProps = IconComponentUIProps
export type IconComponentProps = IconComponentComponentProps