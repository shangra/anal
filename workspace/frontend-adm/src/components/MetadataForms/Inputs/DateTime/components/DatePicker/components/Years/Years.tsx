import dayjs from "dayjs";
import { Button, BUTTON_COLOR, BUTTON_SIZE, BUTTON_VARIANT, ButtonColors, ButtonVariants, Stack }  from "ui-kit";
import { getYearsRange } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Years/utils";
import { YearsProps } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Years/types";
import { DEFAULT_TEST_ID, DEFAULT_MIN_YEAR } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Years/constants";
import { MONTHS_ABBRS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Months/constants";
import styles from './styles/styles.module.css'

export const Years = (props: YearsProps) => {
    const {
        testId = DEFAULT_TEST_ID,
        minYear = DEFAULT_MIN_YEAR,
        maxYear = new Date().getFullYear(),
        viewDate,
        selectedYear,
        onSelectYear,
        showMonthsPanel,
        showStartPanel,
    } = props;

    const years = getYearsRange(minYear, maxYear);
    const current_year = dayjs().year();
    
    return (
        <div className={styles.container} data-test-id={testId}>
            <div className={styles["years-container"]}>
                <Stack direction="row" alignItems='center' justifyContent='center' className={styles.header}>
                    <Stack direction="row" gap="16px">
                        <Button
                            variant={BUTTON_VARIANT.TEXT}
                            color={BUTTON_COLOR.PRIMARY}
                            size={BUTTON_SIZE.SMALL}
                            onClick={showMonthsPanel}
                            rounded
                        >
                            {MONTHS_ABBRS[viewDate?.getMonth()]}
                        </Button>
                        <Button
                            variant={BUTTON_VARIANT.OUTLINED}
                            color={BUTTON_COLOR.PRIMARY}
                            size={BUTTON_SIZE.SMALL}
                            onClick={showStartPanel}
                            rounded
                        >
                            {viewDate?.getFullYear()}
                        </Button>
                    </Stack>
                </Stack>
                {years.map(year => {
                    let buttonColor: ButtonColors = BUTTON_COLOR.SECONDARY;
                    let buttonVariant: ButtonVariants = BUTTON_VARIANT.TEXT;
                    if(current_year === year){
                        buttonVariant = BUTTON_VARIANT.OUTLINED;
                    }
                    if(selectedYear === year) {
                        buttonColor = BUTTON_COLOR.PRIMARY;
                        buttonVariant = BUTTON_VARIANT.CONTAINED;
                      }

                    return(
                    <div className={styles['year-container']} key={`year-${year}`}>
                        <Button
                            // disabled={disabled}
                            variant={buttonVariant}
                            color={buttonColor}
                            onClick={() => onSelectYear(year)}
                            rounded
                            size={BUTTON_SIZE.SMALL}
                        >
                            {year}
                        </Button>
                    </div>
                )})}
            </div>
        </div>
    );
};
