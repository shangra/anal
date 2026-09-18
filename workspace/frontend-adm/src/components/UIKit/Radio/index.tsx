import { Component } from 'react';
import { Radio as RadioComponent, RadioProps as RadioComponentProps} from 'ui-kit'
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

export class Radio extends Component<RadioComponentProps> {
    static constructorSettings = {
        name: 'Радиокнопка',
        description: 'Радиокнопка',
        propsData: {
            value: {
                controlType: FIELD_VARIANTS.INPUT,
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
            disabled: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Неактивная',
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
        <RadioComponent {...this.props} />
    );
}

export type RadioProps = RadioComponentProps;