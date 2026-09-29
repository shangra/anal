import { createFacetStore } from '../../core/createFacetStore'
import {
    cloneConditionalFormattingSettingsState,
    createConditionalFormattingRule,
    emptyConditionalFormattingSettingsState,
    parseConditionalFormattingSettingsState,
    type ConditionalFormattingRule,
    type ConditionalFormattingSettingsState,
} from './types'

const store = createFacetStore<ConditionalFormattingSettingsState>({
    id: 'conditionalFormatting',
    storageKey: 'list-settings-conditional-formatting',
    legacyStorageKeys: ['list-settings-conditional-formatting'],
    keys: ['conditionalFormattingRules'],
    empty: emptyConditionalFormattingSettingsState,
    parse: parseConditionalFormattingSettingsState,
    clone: cloneConditionalFormattingSettingsState,
})

export function getConditionalFormattingSettingsState(): ConditionalFormattingSettingsState {
    return store.getState()
}

export { cloneConditionalFormattingSettingsState }

export const conditionalFormattingSettingsActions = {
    addRule(defaultField?: string): void {
        const newRule = createConditionalFormattingRule(defaultField)
        const { conditionalFormattingRules } = store.getState()
        store.commit({
            conditionalFormattingRules: [...conditionalFormattingRules, newRule],
        })
    },

    updateRule(id: string, patch: Partial<Omit<ConditionalFormattingRule, 'id'>>): void {
        const { conditionalFormattingRules } = store.getState()
        const rules = conditionalFormattingRules.map((rule) => {
            if (rule.id !== id) return rule
            return { ...rule, ...patch }
        })
        store.commit({ conditionalFormattingRules: rules })
    },

    toggleRuleEnabled(id: string): void {
        const { conditionalFormattingRules } = store.getState()
        const rules = conditionalFormattingRules.map((rule) => {
            if (rule.id !== id) return rule
            const updated = { ...rule, enabled: !rule.enabled }
            console.log('[toggleRuleEnabled] toggling rule', rule.id.substring(0,8), 'enabled:', rule.enabled, '->', updated.enabled)
            return updated
        })
        console.log('[toggleRuleEnabled] new rules enabled:', rules.map(r => ({ id: r.id.substring(0,8), enabled: r.enabled })))
        store.commit({ conditionalFormattingRules: rules })
        console.log('[toggleRuleEnabled] after commit, getState():', store.getState().conditionalFormattingRules.map(r => ({ id: r.id.substring(0,8), enabled: r.enabled })))
    },

    setConditionNodes(ruleId: string, nodes: ConditionalFormattingRule['conditionNodes']): void {
        const { conditionalFormattingRules } = store.getState()
        const rules = conditionalFormattingRules.map((rule) => {
            if (rule.id !== ruleId) return rule
            return { ...rule, conditionNodes: nodes }
        })
        store.commit({ conditionalFormattingRules: rules })
    },

    removeRules(ids: string[]): void {
        const toRemove = new Set(ids)
        const { conditionalFormattingRules } = store.getState()
        const rules = conditionalFormattingRules.filter((rule) => !toRemove.has(rule.id))
        store.commit({ conditionalFormattingRules: rules })
    },

    moveRules(ids: string[], direction: 'up' | 'down'): void {
        const selected = new Set(ids)
        if (selected.size === 0) return
        const list = [...store.getState().conditionalFormattingRules]

        if (direction === 'up') {
            if (list.length > 0 && selected.has(list[0].id)) return
            for (let i = 1; i < list.length; i += 1) {
                if (selected.has(list[i].id) && !selected.has(list[i - 1].id)) {
                    ;[list[i - 1], list[i]] = [list[i], list[i - 1]]
                }
            }
        } else {
            if (list.length > 0 && selected.has(list[list.length - 1].id)) return
            for (let i = list.length - 2; i >= 0; i -= 1) {
                if (selected.has(list[i].id) && !selected.has(list[i + 1].id)) {
                    ;[list[i], list[i + 1]] = [list[i + 1], list[i]]
                }
            }
        }

        store.commit({ conditionalFormattingRules: list })
    },

    restoreSnapshot(snapshot: ConditionalFormattingSettingsState): void {
        store.restore(snapshot)
    },
}
