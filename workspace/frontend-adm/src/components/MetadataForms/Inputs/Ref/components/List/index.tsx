import { type FC, useContext } from 'react';
import { List as KitList, type ListProps } from 'ui-kit';
import { WindowContext } from 'components/WindowsCMP/components/Window';

interface IListProps<T = string> extends ListProps<T> {
    root?: React.RefObject<HTMLDivElement>;
}

export const List: FC<IListProps<string>> = (props) => {
    const {
        testId,
        className = '',
        style,
        loading = false,
        options,
        type = 'single',
        actions,
        value,
        resettable = true,
        onChange,
        onClick,
        onMouseEnter,
        onMouseLeave,
        onMouseDown,
        onMouseUp,
        ...restProps
    } = props;

    const context = useContext(WindowContext);

    return (
        <KitList
            testId={testId}
            className={className}
            style={{
                ...style,
            }}
            loading={loading}
            options={options}
            type={type}
            actions={actions}
            value={value}
            resettable={resettable}
            onChange={onChange}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            {...restProps}
        />
    );
};
