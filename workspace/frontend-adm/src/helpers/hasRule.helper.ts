// ===== Базовые сущности =====

import StateManager from "lite-react-statemanager";

export interface Role {
  id: string;
  code: number;
  markdel: number;
  name: string;
  color: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  name: string;
  details: string;
  owned: boolean;
  role: Role[];
}

// ===== Атрибуты (метаданные) =====

export type AttributeType = 'text' | string; // расширяй по мере необходимости

export interface UserAttribute {
  id: string;
  code: number;
  name: string;
  type: AttributeType;
  value: string | null;
}

// ===== Основной пользователь =====

export interface User {
  id: string;
  login: string;
  status: number;
  markdel: number;
  info: Record<string, unknown>;

  // ключ — UUID атрибута
  attributes: Record<string, UserAttribute>;

  // ключ — UUID правила
  rules: Record<string, Rule>;

  // ключ — UUID правила, значение — имя правила
  ruleLogs: Record<string, string>;

  // ключ — имя правила (любая строка), значение — правило
  rulesName: Record<string, Rule>;

  // ключ — UUID роли, значение — имя роли
  roles: Record<string, string>;

  // ключ — UUID группы
  groups: Record<string, unknown>;

}const getUser = (): User | null | undefined => StateManager.state.user;

export const hasRule = (name: string): boolean => {
  const user = getUser();
  console.log(user)
  return Boolean(user?.rulesName?.[name]);
};

export const getRule = (name: string): Rule | undefined => {
  return getUser()?.rulesName?.[name];
};

export const hasActiveRule = (name: string): boolean => {
  const rule = getUser()?.rulesName?.[name];
  if (!rule) return false;
  return rule.owned || rule.role.length > 0;
};