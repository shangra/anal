import { Card as CardComponent, CardProps as CardComponentProps } from 'ui-kit';
import { Component } from 'react';
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

export class Card extends Component<CardComponentProps> {
    static constructorSettings = {
        slots: ["children", "actions"],
        name: 'Карточка',
        componentDescription: 'Карточка',
        propsData: {
            title: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Заголовок карточки',
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
            fullWidth: {
                controlType: FIELD_VARIANTS.CHECKBOX,
                propTitle: 'Во всю ширину',
            },
            suffix: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'Suffix',
            },
            onClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику',
            },
            onDoubleClick: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по двойному клику',
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
        <CardComponent  {...this.props} />
    )
}

export type CardProps = CardComponentProps