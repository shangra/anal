import { Component } from "react"
import PageHeaderFunc from "./PageHeader";
import { PageHeaderProps } from "./types";

export class PageHeaderClass extends Component<PageHeaderProps, any> {

    render() {
        return (<PageHeaderFunc {...this.props} />)
    }
}

export const PageHeader = PageHeaderClass;