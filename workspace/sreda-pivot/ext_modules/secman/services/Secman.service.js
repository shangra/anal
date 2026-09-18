const cryptoCore = require("../../../core/services/crypto");
const VaultAuthFactory = require("./factory/VaultClient.factory");

class SecmanService {

    static crypto(text) {
        const value = process.env.CONNECTOR_SALT || process.env.PWD;
        const algorithm = "aes-256-ctr";
        return cryptoCore.encrypt(algorithm, value, text);
    }

    static decrypt(str) {
        const value = process.env.CONNECTOR_SALT || process.env.PWD;
        const algorithm = "aes-256-ctr";
        if (!str) {
            return undefined;
        }

        if (typeof str === "string") {
            const trimmed = str.trim();
            if (!trimmed) {
                return undefined;
            }
            if (trimmed.startsWith("{")) {
                const parsed = JSON.parse(trimmed);
                if (parsed?.iv && parsed?.content) {
                    return cryptoCore.decrypt(algorithm, value, parsed).trim() || undefined;
                }
            }
            return trimmed;
        }

        if (typeof str === "object" && str.iv && str.content) {
            return cryptoCore.decrypt(algorithm, value, str).trim() || undefined;
        }

        return String(str).trim() || undefined;
    }

    static async getSecret(vaultData) {
        const {
            vault_endpoint,
            vault_namespace,
            vault_auth,
            vault_api_version,
            vault_tenant,
            vault_secret_key,
            vault_role_id = "",
            vault_secret_id = "",
            vault_k8s_jwt = "",
        } = vaultData;

        const roleOrId = this.decrypt(vault_role_id);
        const secretId = this.decrypt(vault_secret_id);

        const options = {
            auth: vault_auth,
            api_version: vault_api_version?.trim() || undefined,
            endpoint: vault_endpoint?.trim() || undefined,
            namespace: vault_namespace?.trim() || undefined,
            role_id: roleOrId,
            secret_id: secretId,
            role: roleOrId,
            jwt: this.decrypt(vault_k8s_jwt),
        };

        const vault = await VaultAuthFactory.get(options);
        const { data = {} } = await vault.read(vault_tenant);

        return data[vault_secret_key] || null;
    }

    async formAfter(res, params) {
        const secmanForm = {
                                name: 'Secman',
                                content: [
                                    {
                                        name: 'use_vault_password',
                                        description: 'Брать пароль к БД из Secman',
                                        type: 'BOOL',
                                        default: false,

                                    },
                                    {
                                        name: 'vault_endpoint',
                                        description: 'Vault: хост (без https://)',
                                        type: 'STRING',
                                        template: 'vault.example.com:8200',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_namespace',
                                        description: 'Vault: namespace (X-Vault-Namespace)',
                                        type: 'STRING',
                                        template: '',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_auth',
                                        description: 'Vault: способ входа',
                                        type: 'LIST',
                                        list: {
                                            approle: 'AppRole',
                                            k8s: 'Kubernetes',
                                        },
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_api_version',
                                        description: 'Vault: версия API',
                                        type: 'STRING',
                                        template: 'v1',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_tenant',
                                        description: 'Vault: путь к секрету',
                                        type: 'STRING',
                                        template: '',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_secret_key',
                                        description: 'Имя поля в data с паролем',
                                        type: 'STRING',
                                        template: 'password',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_role_id',
                                        description: 'AppRole: Role ID; Kubernetes: имя роли в auth/kubernetes',
                                        type: 'STRING',
                                        template: '',
                                        for: ['use_vault_password.true'],
                                    },
                                    {
                                        name: 'vault_secret_id',
                                        description: 'AppRole: Secret ID (или задайте APPSEC_SECRET в окружении)',
                                        type: 'STRING',
                                        template: '',
                                        for: ['use_vault_password.true', 'vault_auth.approle'],
                                    },
                                    {
                                        name: 'vault_k8s_jwt',
                                        description: 'Kubernetes: JWT сервисного аккаунта',
                                        type: 'STRING',
                                        template: '',
                                        for: ['use_vault_password.true', 'vault_auth.k8s'],
                                    },
                                ],
                            }
        const { form } = res;
        form[0].props.tabs.push(secmanForm); //TODO переделать на нормальный поиск по объекту
        return res;
    }

}

module.exports = SecmanService;
