import { useState, MouseEvent } from "react";
import { isValidDate } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/utils";

type UsePickerProps = {
    minDate?: Date;
    maxDate?: Date;
    disabled: boolean;
    defaultOpen: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export const usePicker = ({
    minDate,
    maxDate,
    disabled,
    defaultOpen,
    onClick,
}: UsePickerProps) => {
    if (minDate) {
        const isValidMinDate = isValidDate(minDate);

        if (!isValidMinDate) {
            throw new Error("DatePicker: Invalid min date");
        }
    }

    if (maxDate) {
        const isValidMaxDate = isValidDate(maxDate);

        if (!isValidMaxDate) {
            throw new Error("DatePicker: Invalid max date");
        }
    }

    const [openedCalendar, setOpenedCalendar] = useState(defaultOpen);

    const handleCalendarOpen = () => {
        if (!openedCalendar && !disabled) {
            setOpenedCalendar(true);
        }
    };

    const handleCalendarClose = () => {
        setOpenedCalendar(false);
    };

    const handleInputClick = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (openedCalendar) {
            handleCalendarClose();
        } else {
            handleCalendarOpen();
        }
        onClick?.(event);
    };

    return {
        openedCalendar,
        handleInputClick,
        handleCalendarClose,
        handleCalendarOpen,
    };
};
