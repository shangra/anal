import { Button, useNotification } from 'ui-kit';

interface IProps {
    onClick: () => void;
    className?: string;
}

const CancelReqButton = ({ onClick, className }: IProps) => {
    const notification = useNotification();

    const handleClick = () => {
        notification?.open('Загрузка отменена', {
            color: 'warning',
            timeout: 5000,
        });
        onClick();
    };

    return (
        <Button
            color="error"
            variant="contained"
            onClick={handleClick}
            style={{ pointerEvents: 'auto' }}
            className={className}
        >
            Отменить загрузку
        </Button>
    );
};

export default CancelReqButton;
