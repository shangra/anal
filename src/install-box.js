import { spawnCommand } from './exec.js';
import { logger } from './logger.js';
import {
  PUBLIC_NPM_REGISTRY,
  hasValidNodeModules,
  prepareModuleForPublicInstall,
} from './npm-public.js';

export function boxInstallCommand(mod, box) {
  const flags = mod.buildInstallFlags || box.buildInstallFlags || '';
  const extra = Array.isArray(flags) ? flags.filter(Boolean).join(' ') : String(flags).trim();
  // всегда публичный registry; corporate mirrors запрещены
  // --ignore-scripts: husky/prepare во фронтах на Windows в коробке не нужны
  const parts = ['npm i'];
  if (extra) parts.push(extra);
  if (!/\b--ignore-scripts\b/.test(extra)) parts.push('--ignore-scripts');
  if (!/\b--registry\b/.test(extra)) parts.push(`--registry ${PUBLIC_NPM_REGISTRY}`);
  return parts.join(' ');
}

export async function installBox(box, modules, { dryRun = false } = {}) {
  const targets = modules.filter((mod) => mod.exists && mod.hasPackageJson && mod.kind !== 'static');
  if (targets.length === 0) {
    logger.warn('нет модулей для установки зависимостей');
    return { ok: true };
  }

  logger.info(`ставлю зависимости в ${targets.length} модул(ях) через ${PUBLIC_NPM_REGISTRY}`);

  // модули независимы — ставим параллельно, общее время = самой долгой установке
  await Promise.all(
    targets.map(async (mod) => {
      if (dryRun) {
        logger.pkg(mod.id, `dry-run ${boxInstallCommand(mod, box)}`);
        return;
      }

      const prepared = await prepareModuleForPublicInstall(mod);
      if (!prepared.needsInstall) {
        logger.ok(`${mod.id}: зависимости уже на месте, пропуск`);
        return;
      }

      const command = boxInstallCommand(mod, box);
      logger.pkg(mod.id, command);

      // NODE_ENV=production заставил бы npm выставить --omit=dev и вырезать
      // зависимости, без которых dev-серверы (craco start) не стартуют
      const result = await spawnCommand(command, {
        cwd: mod.absDir,
        env: {
          NODE_ENV: 'development',
          npm_config_registry: PUBLIC_NPM_REGISTRY,
        },
        onLine: (line) => logger.pkg(mod.id, line),
      }).done;
      if (result.code !== 0) {
        throw new Error(`${mod.id}: установка зависимостей завершилась с кодом ${result.code}`);
      }

      if (!(await hasValidNodeModules(mod.absDir))) {
        throw new Error(`${mod.id}: после npm install нет валидных node_modules`);
      }
      logger.ok(`${mod.id}: зависимости установлены`);
    }),
  );

  return { ok: true };
}
