import { Component } from 'react';
import { Checkbox as CheckboxComponent, CheckboxProps as CheckboxComponentProps } from 'ui-kit';
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

export class Checkbox extends Component<CheckboxComponentProps> {
    static constructorSettings = {
        name: 'Чекбокс',
        description: 'Чекбокс',
        propsData: {
            value: {
                controlType: FIELD_VARIANTS.INPUT,
            }, 
            label: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Метка',
            },
            name: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Наименование',
            },
            checked: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Выбран',
            },
            partialChecked: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Выбран частично',
            },
            disabled: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: FIELD_VARIANTS.CHECKBOX,
            },
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
            onDoubleClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по двойному клику',
            },
            onMouseDown: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: FIELD_VARIANTS.FUNCTION,
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
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
            },
        },
    };
    render = () => (
        <CheckboxComponent {...this.props} />
    )
}

export type CheckboxProps = CheckboxComponentProps