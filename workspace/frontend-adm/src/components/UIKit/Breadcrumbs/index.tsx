import { Breadcrumbs as BreadcrumbsComponent, BreadcrumbsProps as BreadcrumbsComponentProps} from "ui-kit"
import { Component } from "react";
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

export class Breadcrumbs extends Component<BreadcrumbsComponentProps> {
    static constructorSettings = {
        name: 'Breadcrumbs',
        description: 'Хлебные крошки',
        propsData: {
            // as: As, 
            // items = [],  // Array<{}>
            backHref: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            className: {
                controlType: FIELD_VARIANTS.INPUT,
            },
            maxItems: {
                controlType: FIELD_VARIANTS.NUMBER,
                propTitle: 'Количество видимых крошек',
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
            },
            onBack: {
                controlType: FIELD_VARIANTS.FUNCTION,
                propTitle: 'Функция по клику "Назад"', 
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
        <BreadcrumbsComponent {...this.props} />
    )
}

export type BreadcrumbsProps = BreadcrumbsComponentProps;