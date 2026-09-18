const Vault = require("node-vault");
const fs = require("node:fs");
const AppRoleAuth = require("./auth/AppRole.auth");
const KubernetesAuth = require("./auth/Kubernetes.auth");

class VaultClientFactory {
  static readPemOrFile(value) {
    if (!value) {
      return undefined;
    }
    const v = String(value).trim();
    if (!v) {
      return undefined;
    }
    if (v.includes("-----BEGIN ")) {
      return v;
    }
    try {
      return fs.readFileSync(v, "utf8");
    } catch (e) {
      return undefined;
    }
  }

  static async get(options) {
    const opts = options || {};
    const { CHECK_CERT, SERVER_KEY, SERVER_CERT, SERVER_CA } = process?.env;
    const isHttps =
      CHECK_CERT === "true" && SERVER_KEY !== undefined && SERVER_CERT !== undefined && SERVER_CA !== undefined;

    const {
      auth = "approle",
      api_version = "v1",
      endpoint,
      namespace,
      role_id,
      secret_id,
      approle_mount_point,
      role,
      jwt,
      k8s_mount_point,
      kubernetesPath,
    } = opts;
    const normalizedAuth = String(auth).toLowerCase();

    const ca = this.readPemOrFile(SERVER_CA);
    const cert = this.readPemOrFile(SERVER_CERT);
    const key = this.readPemOrFile(SERVER_KEY);

    const vault = Vault({
      apiVersion: api_version,
      endpoint: `https://${endpoint}`,
      requestOptions: {
        headers: { "X-Vault-Namespace": namespace },
        strictSSL: isHttps,
        agentOptions: isHttps
          ? {
              ca,
              cert,
              key,
              securityOptions: "SSL_OP_LEGACY_SERVER_CONNECT",
            }
          : undefined,
      },
    });

    switch (normalizedAuth) {
      case "approle":
      case "app_role":
        return AppRoleAuth.auth(vault, {
          role_id,
          secret_id,
          mount_point: approle_mount_point,
        });
      case "k8s":
      case "kubernetes":
        return KubernetesAuth.auth(vault, {
          role,
          jwt,
          mount_point: k8s_mount_point,
          kubernetesPath,
        });
      default:
        throw new Error(`Unknown vault type auth: ${auth}`);
    }
  }
}

module.exports = VaultClientFactory;
