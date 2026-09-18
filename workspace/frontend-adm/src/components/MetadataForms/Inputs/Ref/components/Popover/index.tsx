import { type FC, useContext } from 'react';
import { Popover as KitPopover, type PopoverProps } from 'ui-kit';
import { WindowContext } from 'components/WindowsCMP/components/Window';

interface IPopoverProps extends PopoverProps {
    root?: React.RefObject<HTMLDivElement>;
}

export const Popover: FC<IPopoverProps> = (props) => {
    const { opened, placement, onOpened, content, children, className, style, ...restProps } = props;

    const context = useContext(WindowContext);

    return (
        <KitPopover
            // root={context.ref}
            opened={opened}
            placement={placement || 'bottom'}
            closeOnOutsideClick
            onOpened={(e) => onOpened?.(e)}
            autoWidth
            containerFullWidth={false}
            containerStyle={{ maxWidth: 'var(--ui-kit-popover-max-width, 100%)', width: '100%', padding: 0, }} style={{ background: 'var(--ui-kit-popover-background)', borderRadius: 'var(--ui-kit-popover-border-radius)', boxShadow: 'var(--ui-kit-popover-box-shadow)', padding: 'var(--ui-kit-popover-padding)', maxWidth: 'var(--ui-kit-popover-max-width)', }}
            showArrow
            content={
                <>
                    {/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
                    {/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        {...restProps}
                        className={`${className ?? ''}`}
                        onClick={() => {}}
                        style={{
                            ...style,
                            ...style,
                            // maxWidth: props.refToChildren?.getBoundingClientRect().width,
                        }}
                    >
                        {content || ''}
                    </div>
                </>
            }
            {...restProps}
        >
            {children}
        </KitPopover>
    );
};
