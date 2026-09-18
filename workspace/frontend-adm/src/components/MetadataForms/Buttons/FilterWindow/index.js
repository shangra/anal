import { v4 as uuidv4 } from 'uuid';
import $windows from 'components/WindowsCMP/windows.helper';
import { DRQueryBuilder } from 'components/DRQueryBuilder';
import { Button } from 'ui-kit';
import {convertFiltersToWhereOptions} from 'components/MetadataForms/Buttons/FilterWindow/convertRuleToQuery';

// Это НЕ реактовский компонент, он просто очень архитектурно похож
export class FilterWindow {

    constructor(props) {
        const { title, initialValue, fields, callback } = props;

        this.callback = callback;
        this.state = {
            title: title ?? '',
            fields: fields ?? [],
            initialValue: initialValue ?? '',
            filters: initialValue ?? '',
            tempFilters: null
        }
    };



    transformFilters(filters) {
        if (!filters || !Array.isArray(filters?.rules)) {
            return null;
        }

        const result = filters.rules ? JSON.parse(JSON.stringify(filters)) : filters;
  
        const stack = [];
        if (result.rules) {
            stack.push({ rules: result.rules });
        }

        while (stack.length > 0) {
            const current = stack.pop();
    
            if (!current || !Array.isArray(current.rules)) {
                continue;
            }

            for (let i = 0, len = current.rules.length; i < len; i++) {
                const rule = current.rules[i];
                
                if (rule && typeof rule === 'object' && Array.isArray(rule.rules)) {
                    stack.push({ rules: rule.rules });
                } else if (rule) {
                    current.rules[i] = this.transformRuleValue(rule);
                }
            }
        }

        return result;
    }

    isRefObject = (value) => typeof value === 'object' && 'value' in value && "label" in value

    transformRuleValue(rule) {

        if (!rule || typeof rule !== 'object' || !rule.value) {
            return rule;
        }

        const {value} = rule;
    
        if (this.isRefObject(value)) {
            return {
                ...rule,
                ...rule.value,
            };
        } if(Array.isArray(value)) {
            return {
                ...rule,
                value: value.map((element) => this.isRefObject(element) ? element.value : element)
            } 
        }
    
        return rule;
    }

    likeNotLikeTransform(transformedFilters) {
        if (transformedFilters.rules) {
            transformedFilters.rules = transformedFilters.rules.map(rule=>{
                if (rule.combinator) {
                    this.likeNotLikeTransform(rule);
                } else if (rule.operator === "$like" || rule.operator === "$notLike") {
                        rule.value = `%${rule.value}%`;
                    }
                return rule;
            })
        }
    }

    onQueryChange = (filters) => {
        this.state.tempFilters = filters;
    }

    onApplyClick = (windowUUID) => {
        const { tempFilters } = this.state;
    
        if (tempFilters) {
            const transformedFilters = this.transformFilters(tempFilters);

            const cloneTransformedFilters = structuredClone(transformedFilters);
            this.likeNotLikeTransform(cloneTransformedFilters);
            const where = convertFiltersToWhereOptions(cloneTransformedFilters);

            this.callback?.(tempFilters, where);
            $windows.close(windowUUID);
        }
    }

    open() {
        const windowUUID = uuidv4();

        $windows.open(
            <div>Фильтры для <b>{this.state.title}</b></div>, 
            <div>
                <DRQueryBuilder
                    mode="query"
                    fields={this.state.fields}
                    initialValue={this.state.initialValue}
                    onChange={this.onQueryChange}
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <Button 
                        onClick={() => this.onApplyClick(windowUUID)} 
                        color="primary"
                        style={{ marginLeft: '10px' }}
                    >
                        Применить фильтры
                    </Button>
                </div>
            </div>,
            {
                uuid: windowUUID
            }
        )
    }
}