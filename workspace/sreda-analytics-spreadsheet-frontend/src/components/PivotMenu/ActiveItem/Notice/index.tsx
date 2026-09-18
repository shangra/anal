import { Popover } from '../../../UIKit/Popover';
import { ILayerNoticeItem } from '../../pivot-menu-types/pivot-menu.types';
import { getIconButtonByName } from './helpers/getIconByName';
import NoticeItem, { INoticeItemProps } from './NoticeItem';

const Notice = (props: ILayerNoticeItem) => {
    const icon = getIconButtonByName(props.icon, props.color);

    if (!icon) {
        return null;
    }

    if (!props.content) {
        return icon;
    }

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
        <div
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Popover content={content} placement="left" closeOnOutsideClick>
                {icon}
            </Popover>
        </div>
    );
};

export default Notice;
