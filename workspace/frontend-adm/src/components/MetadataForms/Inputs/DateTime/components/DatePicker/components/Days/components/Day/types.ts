export type DayProps = {
    children: React.ReactNode;
    onClick: () => void;
    empty?: boolean;
    today?: boolean;
    selected?: boolean;
    disabled?: boolean;
    starting?: boolean;
    ending?: boolean;
    ranging?: boolean;
    isFirstInRow?: boolean;
    isLastInRow?: boolean;
};
