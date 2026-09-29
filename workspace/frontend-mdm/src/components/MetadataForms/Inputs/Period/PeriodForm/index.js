import { Component } from 'react';
import { DateTime } from '../../DateTime';
import { dateRanges, getDateTime } from './dateRanges';
import { List } from 'ui-kit';
import { parseInputRange, extractPeriodType } from '../autocode';

export class PeriodForm extends Component {
    constructor(props) {
        super(props);

        const period = props.period ?? 'D=1';
        const innerRange = parseInputRange(period);

        const dateFrom =
            innerRange.innerRangeFrom.length > 9
                ? { from: innerRange.innerRangeFrom }
                : getDateTime(innerRange.innerRangeFrom);
        const datesTo =
            innerRange.innerRangeTo.length > 9
                ? { to: innerRange.innerRangeTo }
                : getDateTime(innerRange.innerRangeTo);

        console.log('innerRange', innerRange, dateFrom, datesTo);

        const range = extractPeriodType(period);

        this.state = {
            period: period,

            dateFrom: dateFrom.from,
            dateTo: datesTo.to,

            fixfrom: period.length >= 9,
            fixto: period.length >= 9,
            range: range,
            innerRangeFrom: innerRange.innerRangeFrom,
            innerRangeTo: innerRange.innerRangeTo,
        };
    }

    onSelect = (item) => {
        // console.log("onSelect", item)

        const range = item[0] ?? 'day';
        this.setState({ range: range });
    };

    onSelectPeriod = (item) => {
        // console.log("onSelectPeriod", item)

        const innerRange = item[0] ?? 'D=1';
        const dates = getDateTime(innerRange);

        const fixfrom = this.state.fixfrom;
        const fixto = this.state.fixto;

        const innerRangeFrom = fixfrom ? this.state.innerRangeFrom : innerRange;
        const innerRangeTo = fixto ? this.state.innerRangeTo : innerRange;
        const period =
            innerRangeFrom === innerRangeTo
                ? innerRangeTo
                : `S${innerRangeFrom}>E${innerRangeTo}`;

        this.setState(
            {
                innerRangeFrom: innerRangeFrom,
                innerRangeTo: innerRangeTo,
                dateFrom: fixfrom ? this.state.dateFrom : dates.from,
                dateTo: fixto ? this.state.dateTo : dates.to,
                period,
            },
            this.changePeriod
        );
    };

    onSelectFix = (item) => {
        // console.log("onSelectFix", item)
        const fixItem = item[0];

        const fixfrom =
            fixItem === 'fixfrom' ? !this.state.fixfrom : this.state.fixfrom;
        const fixto =
            fixItem === 'fixto' ? !this.state.fixto : this.state.fixto;

        this.setState({
            fixfrom: fixfrom,
            fixto: fixto,
        });
    };

    onChangeDateFrom = (val) => {
        const dateFrom = val;
        const fixfrom = false;
        const fixto = false;
        const innerRangeFrom = dateFrom;
        const innerRangeTo = this.state.dateTo;

        const period = `S${dateFrom}>E${this.state.dateTo}`;
        this.setState(
            { dateFrom, fixfrom, fixto, innerRangeFrom, innerRangeTo, period },
            this.changePeriod
        );
    };

    onChangeDateTo = (val) => {
        const dateTo = val;
        const fixfrom = false;
        const fixto = false;
        const innerRangeFrom = this.state.dateFrom;
        const innerRangeTo = dateTo;
        const period = `S${this.state.dateFrom}>E${dateTo}`;

        this.setState(
            { dateTo, fixfrom, fixto, innerRangeFrom, innerRangeTo, period },
            this.changePeriod
        );
    };

    changePeriod = () => {
        // console.log("changePeriod", this.state.period)
        this.props?.onChange(this.state.period);
    };

    render() {
        const range = this.state.range;
        const options = Object.values(dateRanges).map((val) => {
            return { label: val.title, title: val.title, value: val.name };
        });
        let options2 = Object.values(dateRanges[range].ranges).map((val) => {
            return { label: val.title, title: val.title, value: val.name };
        });

        const optionsFix = [
            {
                label: 'Начало фиксация',
                title: 'Начало фиксация',
                value: 'fixfrom',
                status: this.state.fixfrom ? 'success' : '',
            },
            {
                label: 'Конец фиксация',
                title: 'Конец фиксация',
                value: 'fixto',
                status: this.state.fixto ? 'success' : '',
            },
        ];
        const readOnly = range !== 'arbitrary';

        return (
            <div style={{ width: '450px' }}>
                <div style={{ display: 'flex' }}>
                    <div style={{ width: '50%' }}>
                        <DateTime
                            readOnly={readOnly}
                            value={this.state.dateFrom}
                            onChange={this.onChangeDateFrom}
                        />
                    </div>
                    <div style={{ width: '50%' }}>
                        <DateTime
                            readOnly={readOnly}
                            value={this.state.dateTo}
                            onChange={this.onChangeDateTo}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex' }}>
                    <div style={{ width: '50%' }}>
                        <List
                            options={options}
                            type='single'
                            onChange={this.onSelect}
                        />
                    </div>
                    <div
                        style={{
                            width: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        <List
                            options={options2}
                            type='single'
                            onChange={this.onSelectPeriod}
                        />
                        <List
                            options={optionsFix}
                            type='single'
                            onChange={this.onSelectFix}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
