import dayjs from 'dayjs';
import { FC } from 'react';
import { Typography } from 'ui-kit';

import MyButton from '../../../../ui/MyButton/MyButton';
import { IPluginProfileQueryRequestPlanStep } from '../../types';
import styles from './explainListGroup.module.css';

interface IExplainListGroupProps {
    steps: IPluginProfileQueryRequestPlanStep[];
    onClickButton: (id: string) => void;
}

const ExplainListGroup: FC<IExplainListGroupProps> = ({ steps, onClickButton }) => (
    <div className={styles.container}>
        {steps.map((item, index) => (
            <div key={`${item.message}-${index}`} className={styles.item}>
                <div className={styles.content}>
                    <Typography variant="heading5" color="secondary">
                        {`${index + 1}.`}
                    </Typography>
                    <div className={styles.textContainer}>
                        <Typography className={styles.bold} variant="heading5" color="secondary">
                            {item.message}
                        </Typography>
                        <Typography color="secondary">{dayjs(item.date).format('DD MM YYYY HH:mm:ss SSS')}</Typography>
                    </div>
                </div>
                {item.context !== null && <MyButton onClick={() => onClickButton(item.context)}>SQL</MyButton>}
            </div>
        ))}
    </div>
);

export default ExplainListGroup;
