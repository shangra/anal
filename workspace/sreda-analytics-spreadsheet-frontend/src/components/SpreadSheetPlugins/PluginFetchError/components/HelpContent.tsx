import React, { FC } from 'react';
import { ButtonTile } from 'ui-kit';

interface IHelperContent {
    helpers: Array<{ icon: string; text: string; action: string }>;
    status: number;
    title: string;
    message: string;
    stack: string;
    errors: {
        message: string;
        stack: string;
    }[];
}

const HelperContent: FC<IHelperContent> = ({ helpers, title, status, message, errors, stack }) => {
    const handleClick = (action: string) => {
        if (action.startsWith('mailto:')) {
            window.location.href = `${action}?subject=${title}&body=Ссылка: ${
                window.location.href
            }%0D%0DСодержимое ошибки:%0D%0D${JSON.stringify({
                status,
                message,
                errors,
                stack,
            })}`;
        }
        if (action.startsWith('https:')) {
            window.open(action, '_blank');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {helpers.map(({ icon, text, action }) => (
                <ButtonTile
                    fullWidth
                    key={action}
                    description={text}
                    // eslint-disable-next-line react/no-unstable-nested-components, jsx-a11y/alt-text
                    icon={() => <img src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`} />}
                    onClick={() => handleClick(action)}
                />
            ))}
        </div>
    );
};
export { HelperContent };
