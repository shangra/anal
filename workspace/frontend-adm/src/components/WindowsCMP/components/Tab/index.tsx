import { PureComponent, ReactNode } from 'react';
import { PanelPosition } from 'components/WindowsCMP/interfaces';
import style from './style.module.css';
import { Typography, Tooltip } from 'ui-kit';
import cn from 'classnames';

interface IProps {
    title: string;
    position: PanelPosition;
    isActive?: boolean;
    onClick?: () => void;
    beforeIcons?: ReactNode[];
    afterIcons?: ReactNode[];
}

export class Tab extends PureComponent<IProps> {
    render() {
        const { isActive, title, position, onClick, beforeIcons, afterIcons } =
            this.props;

        return (
            <Tooltip
                content={title}
                placement={position === PanelPosition.bottom ? 'top' : 'right'}
            >
                <div
                    className={cn(style.sidebarTab, {
                        [style.activeSidebarTab]: isActive,
                        [style.sidebarTabLeft]: position === PanelPosition.left,
                        [style.sidebarTabRight]:
                            position === PanelPosition.right,
                        [style.sidebarTabBottom]:
                            position === PanelPosition.bottom,
                    })}
                    onClick={onClick}
                >
                    {beforeIcons && (
                        <div className={style.sidebarTabIcons}>
                            {beforeIcons.map((icon, index) => (
                                <div
                                    key={index}
                                    className={style.sidebarTabIcon}
                                >
                                    {icon}
                                </div>
                            ))}
                        </div>
                    )}
                    <Typography
                        variant='body'
                        color='primary'
                        className={style.sidebarTabTitle}
                    >
                        {title}
                    </Typography>
                    {afterIcons && (
                        <div className={style.sidebarTabIcons}>
                            {afterIcons.map((icon, index) => (
                                <div
                                    key={index}
                                    className={style.sidebarTabIcon}
                                >
                                    {icon}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Tooltip>
        );
    }
}
