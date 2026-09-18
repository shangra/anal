import { Button, BUTTON_COLOR, BUTTON_VARIANT, BUTTON_SIZE, ButtonColors, ButtonVariants, Stack } from "ui-kit";
import dayjs from "dayjs";
import cn from 'classnames';
import { checkDateLimit } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Calendar/utils";
import { DEFAULT_TEST_ID, MONTHS_ABBRS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Months/constants";
import { MonthsProps } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Months/types";
import styles from './styles/styles.module.css';

export const Months = (props: MonthsProps) => {
    const {
        minDate,
        maxDate,
        viewDate,
        onSelectMonth,
        showStartPanel,
        showYearsPanel,
        testId = DEFAULT_TEST_ID,
    } = props;

    const viewYear = viewDate?.getFullYear();
    const viewMonthIndex = viewDate?.getMonth();
    const current_month = dayjs().month();
    const minMonth =
        minDate && new Date(minDate.getFullYear(), minDate.getMonth());
    const maxMonth =
        maxDate && new Date(maxDate.getFullYear(), maxDate.getMonth());

    const isDisabledMonth = (monthIndex: number) => {
        const checkedMonth = new Date(viewYear, monthIndex);

        return !checkDateLimit(checkedMonth, minMonth, maxMonth);
    };
    const monthClassName = cn(
        "body",
        styles['month-name'],
    );

    return (
        <Stack direction="column" gap="16px" className={styles.container} data-test-id={testId}>
            <Stack direction="row" alignItems='center' justifyContent='center'>
                <Stack direction="row" gap="1px">
                    <Button
                        variant={BUTTON_VARIANT.OUTLINED}
                        color={BUTTON_COLOR.PRIMARY}
                        rounded size={BUTTON_SIZE.SMALL}
                        className={monthClassName}
                        onClick={showStartPanel}
                    >
                        {MONTHS_ABBRS[viewMonthIndex]}
                    </Button>
                    <Button
                        variant={BUTTON_VARIANT.TEXT}
                        color={BUTTON_COLOR.PRIMARY}
                        rounded size={BUTTON_SIZE.SMALL}
                        onClick={showYearsPanel}
                    >
                        {viewYear}
                    </Button>
                </Stack>
            </Stack>
            <div className={styles['months-container']}>
                {MONTHS_ABBRS.map((month, monthIndex) => {
                    const selected = monthIndex === viewMonthIndex;
                    const disabled = isDisabledMonth(monthIndex);
                    
                    let buttonColor: ButtonColors = BUTTON_COLOR.SECONDARY;
                    let buttonVariant: ButtonVariants = BUTTON_VARIANT.TEXT;
                    if(current_month === monthIndex){
                        buttonVariant = BUTTON_VARIANT.OUTLINED;
                    }
                    if(selected) {
                        buttonColor = BUTTON_COLOR.PRIMARY;
                        buttonVariant = BUTTON_VARIANT.CONTAINED;
                      }

                    return(
                    <div className={styles["month-container"]} key={`month-${monthIndex}`}>
                        <Button
                            disabled={disabled}
                            variant={buttonVariant}
                            color={buttonColor}
                            onClick={() => onSelectMonth(monthIndex)}
                            rounded
                            size={BUTTON_SIZE.SMALL}
                            className={monthClassName}
                        >
                            {month}
                        </Button>
                    </div>
                )})}
            </div>
        </Stack>
    );
};