import { Component } from 'react';
import { Badge as BadgeComponent, BadgeProps as BadgeComponentProps, BADGE_COLOR, BADGE_VARIANT} from "ui-kit"
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

export class Badge extends Component<BadgeComponentProps> {
    static constructorSettings = {
        slot: ["children"],
        name: 'Значок',
        description: 'Значок',
        propsData: {
            count: {
                controlType: FIELD_VARIANTS.NUMBER,
                propTitle: 'Содержимое',
            },
            className: {
                ontrolType: FIELD_VARIANTS.INPUT,
            },
            style: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            childrenContainerClassName: {
                ontrolType: FIELD_VARIANTS.INPUT,
            },
            childrenContainerStyle: {
                controlType: FIELD_VARIANTS.STYLE,
            },
            variant: {
                controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Вариант',
                propVariants: [
                    { label: 'circle', value: BADGE_VARIANT.CIRCLE },
                    { label: 'contained', value: BADGE_VARIANT.CONTAINED },
                    { label: 'text', value: BADGE_VARIANT.TEXT },
                ],
            },
            color: {
                 controlType: FIELD_VARIANTS.SELECT,
                propTitle: 'Цвет',
                propVariants: [
                    {label: 'erron', value: BADGE_COLOR.ERROR},
                    {label: 'primary', value: BADGE_COLOR.PRIMARY},
                    {label: 'secondary', value: BADGE_COLOR.SECONDARY},
                    {label: 'success', value: BADGE_COLOR.SUCCESS},
                    {label: 'warning', value: BADGE_COLOR.WARNING},
                ]
            },
            testId: {
                controlType: FIELD_VARIANTS.INPUT,
                propTitle: 'testId',
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
        <BadgeComponent {...this.props} />
    )
}

export type BadgeProps = BadgeComponentProps;