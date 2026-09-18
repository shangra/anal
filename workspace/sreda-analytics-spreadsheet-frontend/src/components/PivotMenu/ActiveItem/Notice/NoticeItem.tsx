import { ButtonColors } from 'ui-kit';

import { getIconButtonByName } from './helpers/getIconByName';
import styles from './notice.module.css';

export interface INoticeItemProps {
    className?: string;
    style?: object;
    icon?: string;
    color?: ButtonColors;
    content?: INoticeItemProps[] | INoticeItemProps | string;
}

const NoticeItem = (props: INoticeItemProps) => {
    const icon = getIconButtonByName(props.icon || '', props.color || 'primary');
    if (!props.content) return null;

    let content;
    if (Array.isArray(props.content)) {
        content = props.content.map((child: INoticeItemProps, index: number) => (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <NoticeItem key={index} {...child} />
        ));
    } else if (typeof props.content === 'object') {
        // eslint-disable-next-line react/jsx-props-no-spreading
        content = <NoticeItem {...props.content} />;
    } else {
        content = props.content;
    }

    return (
        <div className={`${styles.noticeItem} ${props.className ?? ''}`} style={props.style ?? {}}>
            {icon}
            <span>{content}</span>
        </div>
    );
};

export default NoticeItem;
