class AppRoleAuth {
  static async auth(vault, { role_id, secret_id, mount_point } = {}) {
    const resolvedSecretId = secret_id ?? global?.env?.APPSEC_SECRET;
    if (!resolvedSecretId) {
      throw new Error("AppRole: укажите Secret Id в коннекторе или переменную APPSEC_SECRET");
    }

    const result = await vault.approleLogin({
      role_id,
      secret_id: resolvedSecretId,
      mount_point,
    });

    vault.token = result.auth.client_token;

    return vault;
  }
}

module.exports = AppRoleAuth;
