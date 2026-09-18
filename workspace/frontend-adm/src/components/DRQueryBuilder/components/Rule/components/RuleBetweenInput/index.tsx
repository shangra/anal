import { Component, ReactNode } from "react";
import { MetaField } from "components/DRQueryBuilder/types";
import classes from './RuleBetweenInput.module.css'
import { RuleBaseInput } from "components/DRQueryBuilder/components/Rule/components/RuleBaseInput";

interface IRuleBetweenInputProps {
    type: MetaField['type'];
    value: [string, string];
    handleChange: (newValue: [string | null, string | null]) => void;
}

interface IRuleBetweenInputState {}

export class RuleBetweenInput extends Component<IRuleBetweenInputProps, IRuleBetweenInputState> {
    handleClear = () => {
        this.props.handleChange([null, null])
    }

    render(): ReactNode {
        const { value, type, handleChange } = this.props;
        const [start, end] = value;

        return (
            <div className={classes.betweenContainer}>
                <RuleBaseInput 
                    type={type} 
                    value={start} 
                    handleChange={(newStart) => handleChange([newStart, end])} 
                    placeholder="От"
                />
                <RuleBaseInput 
                    type={type}
                    value={end}
                    handleChange={(newEnd) => handleChange([start, newEnd])}
                    placeholder="До"
                />
            </div>
        )
    }
}