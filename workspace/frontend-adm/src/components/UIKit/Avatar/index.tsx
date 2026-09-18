import { Component } from "react";
import { Avatar as AvatarComponent, AvatarProps as AvatarComponentProps } from "ui-kit"

export class Avatar extends Component<AvatarComponentProps> {
    render() {
        return <AvatarComponent { ...this.props } />
    }
}

export type AvatarProps = AvatarComponentProps