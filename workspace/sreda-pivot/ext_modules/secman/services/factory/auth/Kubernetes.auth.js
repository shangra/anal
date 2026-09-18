class KubernetesAuth {
  static async auth(vault, params = {}) {
    const {
      mount_point,
      kubernetesPath = global?.env.APP_SVC_ACCT_PATH || "kubernetes",
      role = global?.env.APP_NAME,
      jwt = global?.env.APP_SVC_ACCT_SECRET_TOKEN,
    } = params;

    if (!role || !jwt) {
      throw new Error(
        "Kubernetes auth: укажите роль Vault и JWT (vault_role_id и vault_k8s_jwt в коннекторе или APP_NAME / APP_SVC_ACCT_SECRET_TOKEN)"
      );
    }

    const auths = await vault.auths();
    if (!auths.hasOwnProperty("kubernetes/")) {
      vault = await vault.enableAuth({
        mount_point,
        type: "kubernetes",
        description: "Kubernetes auth",
      });
    }

    const result = await vault.kubernetesLogin({ role, jwt, mount_point, kubernetesPath });

    vault.token = result.auth.client_token;

    return vault;
  }
}

module.exports = KubernetesAuth;
