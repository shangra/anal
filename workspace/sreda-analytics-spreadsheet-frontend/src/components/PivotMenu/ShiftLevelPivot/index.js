import { PureComponent } from 'react';
import { EnterIcon, IconButton } from 'ui-kit';

export class ShiftLevelPivot extends PureComponent {
    setShiftLevel = (e) => {
        if (this.props.item.disabled) return;

        e.stopPropagation();

        const tempArray = [...this.props.pivotParams[this.props.blockType]];
        const parent = tempArray.find((item) => item.child?.find((c) => c.id === this.props.item.id));
        const newItem = {
            ...this.props.item,
            child: [],
            typeParam: 'Dimension',
            name: `${parent.name}/${this.props.item.name}`,
            label: `${parent.label}/${this.props.item.description}`,
            description: `${parent.description}/${this.props.item.description}`,
            isIndependentAttribute: true,
            isMasked: parent.isMasked,
        };

        // Меняем название поля в фильтрах
        newItem.filter?.forEach((f) => {
            f.field = `${parent.name}/${this.props.item.name}`;
        });

        // Удаляем как подполе измерения
        const parentIndex = tempArray.findIndex((i) => i.id === parent.id);
        const inParentChildIndex = (tempArray[parentIndex].child ?? []).findIndex((i) => i.id === newItem.id);

        // eslint-disable-next-line no-bitwise
        if (~parentIndex && ~inParentChildIndex) {
            tempArray[parentIndex].child.splice(inParentChildIndex, 1);
            tempArray.splice(parentIndex + 1, 0, newItem);
        }

        this.props.setPivotParams?.({
            ...this.props.pivotParams,
            [this.props.blockType]: tempArray,
        });
    };

    render() {
        return (
            <IconButton
                size={this.props.size}
                variant="text"
                color="secondary"
                icon={EnterIcon}
                onClick={this.setShiftLevel}
            />
        );
    }
}
