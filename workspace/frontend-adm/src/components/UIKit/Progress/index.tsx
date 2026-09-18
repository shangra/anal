import { Component } from "react";
import {
    Progress as ProgressComponent,
    ProgressProps as ProgressComponentProps,
    PROGRESS_COLOR,
    PROGRESS_SIZE,
    PROGRESS_VARIANT,
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

export class Progress extends Component<ProgressProps> {
    static constructorSettings = {
        name: 'Процесс выполнения',
        description: 'Процесс выполнения',
        propsData: {
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
            value: {
                controlType: FIELD_VARIANTS.NUMBER,
            },
            visiblePercent: {
                controlType: FIELD_VARIANTS.CHECKBOX,
            },
            variant: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Вариант',
                propVariants: [
                    {label: 'line', value: PROGRESS_VARIANT.LINE},
                    {label: 'circle', value: PROGRESS_VARIANT.CIRCLE },
                ],
            },
            size: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Размер',
                propVariants: [
                    {label: 'xLarge', value: PROGRESS_SIZE.X_LARGE},
                    {label: 'large', value: PROGRESS_SIZE.LARGE},
                    {label: 'medium', value: PROGRESS_SIZE.MEDIUM},
                    {label: 'small', value: PROGRESS_SIZE.SMALL},
                    {label: 'xSmall', value: PROGRESS_SIZE.X_SMALL},
                ],
            },
            color: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'controlled', value: PROGRESS_COLOR.CONTROLLED},
                    {label: 'erron', value: PROGRESS_COLOR.ERROR},
                    {label: 'primary', value: PROGRESS_COLOR.PRIMARY},
                    {label: 'secondary', value: PROGRESS_COLOR.SECONDARY},
                ]
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
                propTitle: 'Функция при уводе курсора',
            },
        },
    };

    render = () => (
        <ProgressComponent { ...this.props } />
    )
}

export type ProgressProps = ProgressComponentProps;