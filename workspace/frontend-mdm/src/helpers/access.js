import StateManager from 'lite-react-statemanager';

// ты владеешь всеми правами ?
export function isRulesOwned(rules, userRules) {
    // todo добавить права администратора после окончания установки доступа
    if (!Array.isArray(rules)) {
        return true;
    }
    // if (!userRules['Administrator']) {
    for (const rule of rules) {
        if (!userRules?.[rule]) {
            return false;
        }
    }
    // }
    return true;
}

export function hasRule(rule) {
    const userRules = StateManager.state.user.rulesName;
    const rules = [];
    rules.push(rule);

    let result = false;
    if (userRules !== undefined) {
        result = isRulesOwned(rules, userRules);
    }
    return result;
}
