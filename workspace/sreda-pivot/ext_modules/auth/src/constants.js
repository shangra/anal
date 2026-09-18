const RULE_ID_ADMINISTRATOR = '12e32c9d-6e4f-4d57-ae22-5cddaabf343c';
const RULE_ID_ALL_READ = '90499885-ae60-440b-a59f-cfd3958110cd';
const RULE_ADMINISTRATOR = 'Administrator';

const defaultRules = sreda.env?.DEFAULTRULES_USER
    ? sreda.env.DEFAULTRULES_USER
    : ['90499885-ae60-440b-a59f-cfd3958110cd'];
const defaultRoles = sreda.env?.DEFAULTROLES_USER
    ? sreda.env.DEFAULTROLES_USER
    : [];
const defaultGroups = sreda.env?.DEFAULTGROUPS_USER
    ? sreda.env.DEFAULTGROUPS_USER
    : [];
const loginRegExp = /^[a-zA-Z0-9_\-@\.]{3,}$/;
const emailRegExp = /^[A-Z0-9._%+-]+@[A-Z0-9-]+.+.[A-Z]{2,4}$/i;

module.exports = {
    RULE_ID_ADMINISTRATOR,
    RULE_ID_ALL_READ,
    RULE_ADMINISTRATOR,
    defaultRules,
    defaultRoles,
    defaultGroups,
    loginRegExp,
    emailRegExp,
};
