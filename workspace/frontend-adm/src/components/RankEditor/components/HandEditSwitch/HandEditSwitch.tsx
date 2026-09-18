import { Switch } from 'ui-kit';

interface HandEditSwitchProps {
    isHandEdit: boolean;
    onChange: () => void;
}

export const HandEditSwitch = ({ isHandEdit, onChange }: HandEditSwitchProps) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <Switch label="Ручная сортировка" checked={isHandEdit} onChange={onChange} />
        </div>
    );
