import { ReactNode, useEffect } from 'react';
import { NotificationColors, useNotification } from 'ui-kit';

/**
 * Этот компонент рендерится внутри render() и предоставляет
 * callback-метод для показа уведомлений.
 */

export interface INotifyConfig {
    color?: NotificationColors;
    timeout?: number;
}

interface INotificationBridgeProps {
    onNotify: (notify: (content: ReactNode, config?: INotifyConfig) => number) => void;
}

export const NotificationBridge: React.FC<INotificationBridgeProps> = ({ onNotify }) => {
    const notification = useNotification();

    useEffect(() => {
        if (notification) {
            onNotify(notification.open.bind(notification));
        }
    }, [notification, onNotify]);

    return null; // Не рендерим ничего видимого
};
