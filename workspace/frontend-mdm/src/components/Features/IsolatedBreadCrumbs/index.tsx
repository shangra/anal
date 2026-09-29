import { Component } from "react"
import { BreadCrumbsType } from "./types";
import BreadCrumbs from "./BreadCrumbs";

export class IsolatedBreadCrumbsComponent extends Component<BreadCrumbsType, {}> {

    static constructorSettings = {
        name: 'BreadCrumbs',
        description: 'Компонент "Хлебные крошки"',
        propsData: {
            rootPageId: {
                controlType: "input",
            },
        },
    }

    render() {
        return (<BreadCrumbs key={window.location.pathname} {...this.props} />)
    }
}

export const IsolatedBreadCrumbs = IsolatedBreadCrumbsComponent;