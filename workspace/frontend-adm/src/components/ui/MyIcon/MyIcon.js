import { Component } from 'react';
import style from './MyIcon.module.css';
import { Icon } from '../../index';

class MyIcon extends Component {
    render() {
        const { badge, hoverOff, ...props } = this.props;
        const hoverSelector = hoverOff ? '' : style.hover;
        const className = `${style.myIcon} ${this.props.className ?? ''} bi ${this.props.icon} ${hoverSelector}`;
        return (
            // todo сделать badge отдельным компонентом оборачивающим children
            <div className={style.container} style={this.props.containerStyle}>
                <Icon
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...props}
                    style={{
                        margin: this.props.margin,
                        color: this.props.color ?? '',
                        fontSize: this.props.size ?? 25,
                        ...(props.style ?? {}),
                    }}
                    className={className}
                />
                {/* <i */}
                {/*    {...props} */}
                {/*    className={className} */}
                {/* /> */}
                {badge && <div className={style.badge} />}
            </div>
        );
    }
}

export default MyIcon;
