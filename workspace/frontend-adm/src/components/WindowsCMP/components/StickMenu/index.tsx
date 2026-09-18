import React, { PureComponent } from 'react';
import { Dropdown } from 'ui-kit';
import { PanelPosition } from 'components/WindowsCMP/interfaces';
import { StickWindowIcon } from 'components/WindowsCMP/icons/StickWindowIcon';

interface IProps {
    onSelect: (newPosition: PanelPosition) => void;
}

export class StickMenu extends PureComponent<IProps> {
    onSelect = (newPosition: PanelPosition) => () => {
        this.props.onSelect(newPosition);
    };

    render() {
        return (
            <Dropdown
                variant='outlined'
                leftIcon={StickWindowIcon}
                color='controlled'
                size='small'
                options={[
                    {
                        label: 'Слева',
                        onClick: this.onSelect(PanelPosition.left),
                    },
                    {
                        label: 'Справа',
                        onClick: this.onSelect(PanelPosition.right),
                    },
                    {
                        label: 'Снизу',
                        onClick: this.onSelect(PanelPosition.bottom),
                    },
                ]}
                style={{ marginRight: 8 }}
                onMouseDown={(e) => e.stopPropagation()}
            />
        );
    }
}
