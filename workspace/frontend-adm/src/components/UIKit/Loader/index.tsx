import { Component } from "react";
import { Loader as LoaderComponent, LoaderProps as LoaderComponentProps, LOADER_COLOR, LOADER_SIZE} from "ui-kit"
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

export class Loader extends Component<LoaderComponentProps> {
    static constructorSettings = {
        name: 'Индикатор загрузки',
        description: 'Индикатор закгрузки',
        propsData: {
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
             color:{
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'erron', value: LOADER_COLOR.ERROR},
                    {label: 'primary', value: LOADER_COLOR.PRIMARY},
                    {label: 'secondary', value: LOADER_COLOR.SECONDARY},
                    {label: 'success', value: LOADER_COLOR.SUCCESS},
                    {label: 'warning', value: LOADER_COLOR.WARNING},
                ]
            },
            size: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Размер',
                propVariants: [
                    {label: 'xLarge', value: LOADER_SIZE.X_LARGE},
                    {label: 'large', value: LOADER_SIZE.LARGE},
                    {label: 'medium', value: LOADER_SIZE.MEDIUM},
                    {label: 'small', value: LOADER_SIZE.SMALL},
                    {label: 'sSmall', value: LOADER_SIZE.X_SMALL},
                ],
            },
            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
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
        <LoaderComponent { ...this.props } />
    )
}

export type LoaderProps = LoaderComponentProps