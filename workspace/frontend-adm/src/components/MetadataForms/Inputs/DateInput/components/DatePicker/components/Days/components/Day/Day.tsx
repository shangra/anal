import { FC } from "react";
import { Button, BUTTON_COLOR, BUTTON_VARIANT, ButtonVariants, ButtonColors } from "ui-kit";
import { DayProps } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/components/Days/components/Day/types";
import cn from "classnames";
import styles from './styles/styles.module.css';


export const Day: FC<DayProps> = ({
    children,
    onClick,
    empty,
    today,
    selected,
    disabled,
    starting,
    ending,
    ranging,
    isFirstInRow,
    isLastInRow,
  }) => {

    const buttonSetter = () => {
      let buttonVariant: ButtonVariants = BUTTON_VARIANT.TEXT;
      let buttonColor: ButtonColors = BUTTON_COLOR.SECONDARY;
      if(ranging) buttonColor = BUTTON_COLOR.SECONDARY;
      if(today) buttonVariant = BUTTON_VARIANT.OUTLINED;
      if(selected) {
        buttonColor = BUTTON_COLOR.PRIMARY;
        buttonVariant = BUTTON_VARIANT.CONTAINED;
      }
       return {buttonColor, buttonVariant};
    };
    const {buttonColor, buttonVariant} = buttonSetter();
    const dayClassName = cn(
        styles.day, {
          [styles.day_starting]: starting,
          [styles.day_ending]: ending,
          [styles.day_ranging]: ranging && !ending && !starting,
          [styles.day_first_in_row]: isFirstInRow && ranging,
          [styles.day_last_in_row]: isLastInRow && ranging,
        });
    return (
      <div className={dayClassName}>
        <Button
          disabled={disabled}
          size="small"
          variant={buttonVariant}
          color={buttonColor}
          rounded
          onClick={!disabled && !empty ? onClick : undefined}
          style={{width: '100%'}}
        >
          {children as number}
        </Button>
      </div>
    );
  };
