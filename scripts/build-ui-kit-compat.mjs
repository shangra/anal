/**
 * Собирает vendors/ui-kit-compat — совместимый ui-kit для админки.
 * Не жёсткая привязка: при наличии боевого tgz коробка его не трогает.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'vendors', 'ui-kit-compat');
const names = JSON.parse(fs.readFileSync(path.join(root, 'vendors', '_ui-kit-names.json'), 'utf8'));

const CONST_ENUMS = {
  BUTTON_COLOR: ['PRIMARY', 'SECONDARY', 'SUCCESS', 'WARNING', 'ERROR', 'INFO', 'INHERIT'],
  BUTTON_SIZE: ['X_LARGE', 'LARGE', 'MEDIUM', 'SMALL', 'X_SMALL'],
  BUTTON_TYPE: ['BUTTON', 'SUBMIT', 'RESET'],
  BUTTON_VARIANT: ['CONTAINED', 'OUTLINED', 'TEXT', 'LINK'],
  INPUT_STATUS: ['DEFAULT', 'ERROR', 'SUCCESS', 'WARNING'],
  INPUT_TYPE: ['TEXT', 'PASSWORD', 'NUMBER', 'EMAIL', 'SEARCH', 'TEL', 'URL'],
  INPUT_VARIANT: ['OUTLINED', 'CONTAINED', 'STANDARD'],
  SELECT_STATUS: ['DEFAULT', 'ERROR', 'SUCCESS', 'WARNING'],
  SELECT_VARIANT: ['OUTLINED', 'CONTAINED'],
  TEXTAREA_STATUS: ['DEFAULT', 'ERROR', 'SUCCESS', 'WARNING'],
  TEXTAREA_VARIANT: ['OUTLINED', 'CONTAINED'],
  ICON_COLOR: ['TEXT', 'ERROR', 'PRIMARY', 'SECONDARY', 'SUCCESS', 'WARNING', 'ICON', 'WHITE'],
  ICON_SIZE: ['X_LARGE', 'LARGE', 'MEDIUM', 'SMALL', 'X_SMALL'],
  LOADER_COLOR: ['PRIMARY', 'SECONDARY', 'WHITE', 'INHERIT'],
  LOADER_SIZE: ['LARGE', 'MEDIUM', 'SMALL'],
  BADGE_COLOR: ['PRIMARY', 'SECONDARY', 'SUCCESS', 'WARNING', 'ERROR', 'INFO'],
  BADGE_VARIANT: ['FILLED', 'OUTLINED', 'DOT'],
  CHIP_COLOR: ['PRIMARY', 'SECONDARY', 'SUCCESS', 'WARNING', 'ERROR', 'DEFAULT'],
  CHIP_SIZE: ['LARGE', 'MEDIUM', 'SMALL'],
  CHIP_VARIANT: ['FILLED', 'OUTLINED'],
  ALERT_COLOR: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
  AVATAR_SIZE: ['LARGE', 'MEDIUM', 'SMALL'],
  ACCORDION_ICON_POSITION: ['START', 'END'],
  TABS_VARIANT: ['STANDARD', 'SCROLLABLE', 'FULL_WIDTH'],
  TOGGLE_BUTTON_SIZE: ['LARGE', 'MEDIUM', 'SMALL'],
  PROGRESS_COLOR: ['PRIMARY', 'SECONDARY', 'SUCCESS', 'WARNING', 'ERROR'],
  PROGRESS_SIZE: ['LARGE', 'MEDIUM', 'SMALL'],
  PROGRESS_VARIANT: ['DETERMINATE', 'INDETERMINATE'],
  LIST_TYPE: ['UL', 'OL'],
  LIST_ITEM_STATUS: ['DEFAULT', 'SELECTED', 'DISABLED'],
  LIST_ITEM_TYPE: ['DEFAULT', 'BUTTON', 'LINK'],
  STACK_DIRECTION: ['ROW', 'COLUMN', 'ROW_REVERSE', 'COLUMN_REVERSE'],
  STACK_ALIGN_ITEM: ['START', 'CENTER', 'END', 'STRETCH', 'BASELINE'],
  STACK_JUSTIFY_CONTENT: ['START', 'CENTER', 'END', 'SPACE_BETWEEN', 'SPACE_AROUND', 'SPACE_EVENLY'],
  STACK_WRAP: ['NOWRAP', 'WRAP', 'WRAP_REVERSE'],
  GRID_ALIGN_CONTENT: ['START', 'CENTER', 'END', 'STRETCH', 'SPACE_BETWEEN', 'SPACE_AROUND'],
  GRID_ALIGN_ITEMS: ['START', 'CENTER', 'END', 'STRETCH'],
  GRID_AUTO_FLOW: ['ROW', 'COLUMN', 'DENSE'],
  GRID_JUSTIFY_CONTENT: ['START', 'CENTER', 'END', 'SPACE_BETWEEN', 'SPACE_AROUND'],
  GRID_JUSTIFY_ITEMS: ['START', 'CENTER', 'END', 'STRETCH'],
  GRID_ELEMENT_ALIGN_SELF: ['AUTO', 'START', 'CENTER', 'END', 'STRETCH'],
  GRID_ELEMENT_JUSTIFY_SELF: ['AUTO', 'START', 'CENTER', 'END', 'STRETCH'],
  TYPOGRAPHY_COLOR: ['PRIMARY', 'SECONDARY', 'TEXT', 'ERROR', 'SUCCESS', 'WARNING', 'INHERIT'],
  TYPOGRAPHY_VARIANT: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BODY1', 'BODY2', 'CAPTION', 'OVERLINE', 'SUBTITLE1', 'SUBTITLE2'],
  TYPOGRAPHY_WEIGHT: ['LIGHT', 'REGULAR', 'MEDIUM', 'BOLD'],
};

const ALIAS_CONST = {
  ButtonColors: 'BUTTON_COLOR',
  ButtonVariants: 'BUTTON_VARIANT',
  InputStatuses: 'INPUT_STATUS',
  InputTypes: 'INPUT_TYPE',
  InputVariants: 'INPUT_VARIANT',
};

const SPECIAL_CONST = {
  MAX_MINUTE: 59,
  SEPARATOR: '/',
};

const THEME_NAMES = new Set(['LIGHT_THEME', 'DARK_THEME', 'GALAXY_THEME']);

const TYPE_ONLY = new Set(
  names.filter(
    (n) =>
      n.endsWith('Props') ||
      [
        'Theme',
        'DateValue',
        'DateRangeValue',
        'SelectOption',
        'DropdownOption',
        'ListOption',
        'TreeSelectOption',
        'FlatTreeNode',
        'NormalizedNode',
        'IconComponentProps',
      ].includes(n),
  ),
);

const ICON_NAMES = names.filter((n) => n !== 'Icon' && (/Icon$/.test(n) || n === 'DefaultIcon'));
const COMPONENT_SPECIAL = new Set([
  'Icon',
  'ThemeProvider',
  'NotificationsProvider',
  'Modal',
  'Drawer',
  'Popover',
  'Tooltip',
  'Dropdown',
  'Select',
  'MultiSelect',
  'TreeSelect',
  'TreeMultiSelect',
  'TreeControlled',
  'TreeDataControlled',
  'Button',
  'Input',
  'TextArea',
  'Checkbox',
  'Switch',
  'Radio',
  'Loader',
  'Stack',
  'Grid',
  'GridElement',
  'Typography',
  'Tabs',
  'Tab',
  'Table',
  'TableHead',
  'TableBody',
  'TableRow',
  'TableCell',
  'Pagination',
  'Progress',
  'Chip',
  'Badge',
  'Alert',
  'Card',
  'List',
  'ListItem',
  'Accordion',
  'Avatar',
  'Backdrop',
  'Breadcrumbs',
  'CroppedText',
  'IconButton',
  'ToggleButton',
  'DatePicker',
  'DateRangePicker',
  'TimePicker',
  'ColorPicker',
  'PopConfirm',
]);

fs.mkdirSync(outDir, { recursive: true });

const indexJs = `/* sreda ui-kit compat — drop-in для админки, пока нет боевого vendors/ui-kit/*.tgz */
'use strict';
const React = require('react');

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function enumOf(values) {
  return Object.freeze(Object.fromEntries(values.map((v) => [v, v.toLowerCase().replace(/_/g, '-')]))); 
}

${Object.entries(CONST_ENUMS)
  .map(([k, vals]) => `const ${k} = enumOf(${JSON.stringify(vals)});`)
  .join('\n')}
${Object.entries(ALIAS_CONST)
  .map(([alias, target]) => `const ${alias} = ${target};`)
  .join('\n')}
${Object.entries(SPECIAL_CONST)
  .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
  .join('\n')}

function makeTheme(name, palette) {
  return {
    name,
    palette,
    colors: palette,
    typography: { fontFamily: 'Segoe UI, system-ui, sans-serif' },
  };
}

const LIGHT_THEME = makeTheme('light', {
  primary: '#148F5C',
  secondary: '#2B3A4A',
  background: '#F5F7F9',
  surface: '#FFFFFF',
  text: '#1C2430',
  muted: '#6B7785',
  border: '#D7DEE7',
  error: '#D14343',
  warning: '#C47F17',
  success: '#148F5C',
});
const DARK_THEME = makeTheme('dark', {
  primary: '#2FBF7B',
  secondary: '#9AA8B6',
  background: '#121820',
  surface: '#1C2430',
  text: '#F3F6F9',
  muted: '#9AA8B6',
  border: '#2E3A48',
  error: '#FF6B6B',
  warning: '#F0B429',
  success: '#2FBF7B',
});
const GALAXY_THEME = makeTheme('galaxy', {
  primary: '#3D8BFF',
  secondary: '#7C8CFF',
  background: '#0B1020',
  surface: '#151B2E',
  text: '#E8EEFF',
  muted: '#9AA6C7',
  border: '#2A3352',
  error: '#FF6B8A',
  warning: '#FFC14D',
  success: '#3DDC97',
});

function themeToVars(theme) {
  const p = (theme && (theme.palette || theme.colors)) || LIGHT_THEME.palette;
  return {
    '--uk-primary': p.primary,
    '--uk-secondary': p.secondary,
    '--uk-bg': p.background,
    '--uk-surface': p.surface,
    '--uk-text': p.text,
    '--uk-muted': p.muted,
    '--uk-border': p.border,
    '--uk-error': p.error,
    '--uk-warning': p.warning,
    '--uk-success': p.success,
  };
}

const ThemeProvider = React.forwardRef(function ThemeProvider({ theme = LIGHT_THEME, children, className, style, ...rest }, ref) {
  return React.createElement(
    'div',
    {
      ref,
      className: cx('uk-root', className),
      'data-uk-theme': theme && theme.name,
      style: { ...themeToVars(theme), ...style },
      ...rest,
    },
    children,
  );
});
ThemeProvider.displayName = 'ThemeProvider';

const NotificationsProvider = React.forwardRef(function NotificationsProvider({ children, ...rest }, ref) {
  return React.createElement('div', { ref, className: 'uk-notifications', ...rest }, children);
});
NotificationsProvider.displayName = 'NotificationsProvider';

const Icon = React.forwardRef(function Icon(props, ref) {
  const {
    children,
    className,
    color,
    size,
    width,
    height,
    viewBox = '0 0 24 24',
    style,
    onClick,
    ...rest
  } = props;
  const dim =
    size === 'x-large' || size === ICON_SIZE.X_LARGE ? 28 :
    size === 'large' || size === ICON_SIZE.LARGE ? 24 :
    size === 'small' || size === ICON_SIZE.SMALL ? 16 :
    size === 'x-small' || size === ICON_SIZE.X_SMALL ? 12 : 20;
  return React.createElement(
    'svg',
    {
      ref,
      className: cx('uk-icon', color && \`uk-icon--\${color}\`, className),
      width: width || dim,
      height: height || dim,
      viewBox,
      fill: 'currentColor',
      style,
      onClick,
      role: onClick ? 'button' : 'img',
      ...rest,
    },
    children || React.createElement('path', { d: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' }),
  );
});
Icon.displayName = 'Icon';

function makeIcon(name, pathD) {
  const Comp = React.forwardRef(function NamedIcon(props, ref) {
    return React.createElement(
      Icon,
      { ref, 'data-uk-icon': name, ...props },
      React.createElement('path', { d: pathD }),
    );
  });
  Comp.displayName = name;
  return Comp;
}

const ICON_PATH = 'M12 5a7 7 0 100 14 7 7 0 000-14zm0 2a5 5 0 110 10 5 5 0 010-10z';
${ICON_NAMES.map((n) => `const ${n} = makeIcon('${n}', ICON_PATH);`).join('\n')}

function Button({ children, className, variant, color, size, fullWidth, disabled, loading, type = 'button', leftIcon, rightIcon, onClick, style, ...rest }) {
  return React.createElement(
    'button',
    {
      type,
      className: cx(
        'uk-btn',
        variant && \`uk-btn--\${variant}\`,
        color && \`uk-btn--color-\${color}\`,
        size && \`uk-btn--\${size}\`,
        fullWidth && 'uk-btn--block',
        loading && 'uk-btn--loading',
        className,
      ),
      disabled: disabled || loading,
      onClick,
      style,
      ...rest,
    },
    leftIcon,
    loading ? React.createElement('span', { className: 'uk-spinner' }) : null,
    children,
    rightIcon,
  );
}

function Input({ className, variant, status, type = 'text', fullWidth, hint, label, error, value, defaultValue, onChange, onBlur, disabled, placeholder, style, leftIcon, rightIcon, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-field', fullWidth && 'uk-field--block', className), style },
    label ? React.createElement('span', { className: 'uk-field__label' }, label) : null,
    React.createElement(
      'span',
      { className: cx('uk-input-wrap', variant && \`uk-input-wrap--\${variant}\`, status && \`uk-input-wrap--\${status}\`) },
      leftIcon,
      React.createElement('input', {
        className: 'uk-input',
        type,
        value,
        defaultValue,
        onChange,
        onBlur,
        disabled,
        placeholder,
        ...rest,
      }),
      rightIcon,
    ),
    (error || hint) ? React.createElement('span', { className: 'uk-field__hint' }, error || hint) : null,
  );
}

function TextArea({ className, variant, status, label, hint, error, fullWidth, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-field', fullWidth && 'uk-field--block', className) },
    label ? React.createElement('span', { className: 'uk-field__label' }, label) : null,
    React.createElement('textarea', {
      className: cx('uk-textarea', variant && \`uk-textarea--\${variant}\`, status && \`uk-textarea--\${status}\`),
      ...rest,
    }),
    (error || hint) ? React.createElement('span', { className: 'uk-field__hint' }, error || hint) : null,
  );
}

function Checkbox({ className, label, children, checked, defaultChecked, onChange, disabled, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-check', className) },
    React.createElement('input', { type: 'checkbox', checked, defaultChecked, onChange, disabled, ...rest }),
    React.createElement('span', null, label || children),
  );
}

function Switch({ className, checked, defaultChecked, onChange, disabled, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-switch', className) },
    React.createElement('input', { type: 'checkbox', checked, defaultChecked, onChange, disabled, ...rest }),
    React.createElement('span', { className: 'uk-switch__track' }),
  );
}

function Radio({ className, label, children, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-check', className) },
    React.createElement('input', { type: 'radio', ...rest }),
    React.createElement('span', null, label || children),
  );
}

function Loader({ className, size, color, ...rest }) {
  return React.createElement('span', {
    className: cx('uk-spinner', size && \`uk-spinner--\${size}\`, color && \`uk-spinner--\${color}\`, className),
    'aria-label': 'loading',
    ...rest,
  });
}

function Stack({ className, direction = 'column', alignItems, justifyContent, wrap, gap, spacing, children, style, ...rest }) {
  const dir = String(direction).toLowerCase().replace(/_/g, '-');
  return React.createElement(
    'div',
    {
      className: cx('uk-stack', \`uk-stack--\${dir}\`, className),
      style: {
        alignItems: alignItems && String(alignItems).toLowerCase(),
        justifyContent: justifyContent && String(justifyContent).toLowerCase().replace(/_/g, '-'),
        flexWrap: wrap && String(wrap).toLowerCase().replace(/_/g, '-'),
        gap: gap != null ? gap : spacing,
        ...style,
      },
      ...rest,
    },
    children,
  );
}

function Grid({ className, children, style, columns, gap, ...rest }) {
  return React.createElement('div', {
    className: cx('uk-grid', className),
    style: { gridTemplateColumns: columns, gap, ...style },
    ...rest,
  }, children);
}
function GridElement({ className, children, style, ...rest }) {
  return React.createElement('div', { className: cx('uk-grid__item', className), style, ...rest }, children);
}

function Typography({ className, variant, color, weight, children, component, style, ...rest }) {
  const tag =
    component ||
    (/^h[1-6]$/i.test(String(variant || '')) ? String(variant).toLowerCase() :
      variant === 'H1' ? 'h1' : variant === 'H2' ? 'h2' : variant === 'H3' ? 'h3' :
      variant === 'H4' ? 'h4' : variant === 'H5' ? 'h5' : variant === 'H6' ? 'h6' : 'p');
  return React.createElement(tag, {
    className: cx('uk-typo', variant && \`uk-typo--\${String(variant).toLowerCase()}\`, color && \`uk-typo--\${color}\`, weight && \`uk-typo--w-\${weight}\`, className),
    style,
    ...rest,
  }, children);
}

function Modal({ open, isOpen, visible, onClose, onCancel, children, className, title, ...rest }) {
  const shown = open ?? isOpen ?? visible ?? true;
  if (!shown) return null;
  const close = onClose || onCancel || (() => {});
  return React.createElement(
    'div',
    { className: 'uk-modal', role: 'dialog', ...rest },
    React.createElement('div', { className: 'uk-modal__backdrop', onClick: close }),
    React.createElement(
      'div',
      { className: cx('uk-modal__panel', className) },
      title ? React.createElement('div', { className: 'uk-modal__title' }, title) : null,
      children,
    ),
  );
}

function Drawer(props) { return React.createElement(Modal, props); }

function Popover({ children, content, open, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-popover', className), ...rest },
    children,
    open ? React.createElement('div', { className: 'uk-popover__content' }, content) : null,
  );
}

function Tooltip({ children, title, content, className, ...rest }) {
  return React.createElement('span', {
    className: cx('uk-tooltip', className),
    title: title || (typeof content === 'string' ? content : undefined),
    ...rest,
  }, children);
}

function Dropdown({ children, options, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-dropdown', className), ...rest },
    children,
    Array.isArray(options) ? React.createElement('div', { className: 'uk-dropdown__menu' },
      options.map((opt, i) => React.createElement('div', { key: opt?.value ?? i, className: 'uk-dropdown__item' }, opt?.label ?? String(opt))),
    ) : null,
  );
}

function Select({ className, options = [], value, defaultValue, onChange, disabled, placeholder, ...rest }) {
  return React.createElement(
    'select',
    { className: cx('uk-select', className), value, defaultValue, onChange, disabled, ...rest },
    placeholder ? React.createElement('option', { value: '' }, placeholder) : null,
    (options || []).map((opt, i) => {
      const v = opt && typeof opt === 'object' ? opt.value : opt;
      const label = opt && typeof opt === 'object' ? opt.label : opt;
      return React.createElement('option', { key: String(v ?? i), value: v }, label);
    }),
  );
}
function MultiSelect(props) {
  return React.createElement(Select, { multiple: true, ...props });
}
function TreeSelect(props) { return React.createElement(Select, props); }
function TreeMultiSelect(props) { return React.createElement(Select, { multiple: true, ...props }); }
function TreeControlled({ children, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-tree', className), ...rest }, children);
}
function TreeDataControlled(props) { return React.createElement(TreeControlled, props); }

function Tabs({ children, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-tabs', className), role: 'tablist', ...rest }, children);
}
function Tab({ children, className, selected, active, ...rest }) {
  return React.createElement('button', {
    type: 'button',
    className: cx('uk-tab', (selected || active) && 'uk-tab--active', className),
    role: 'tab',
    ...rest,
  }, children);
}

function Table({ children, className, ...rest }) {
  return React.createElement('table', { className: cx('uk-table', className), ...rest }, children);
}
function TableHead({ children, ...rest }) { return React.createElement('thead', rest, children); }
function TableBody({ children, ...rest }) { return React.createElement('tbody', rest, children); }
function TableRow({ children, ...rest }) { return React.createElement('tr', rest, children); }
function TableCell({ children, ...rest }) { return React.createElement('td', rest, children); }

function Pagination({ page = 1, count = 1, onChange, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-pagination', className), ...rest },
    React.createElement('button', { type: 'button', disabled: page <= 1, onClick: () => onChange && onChange(page - 1) }, '‹'),
    React.createElement('span', null, \`\${page} / \${count}\`),
    React.createElement('button', type: 'button', disabled: page >= count, onClick: () => onChange && onChange(page + 1) }, '›'),
  );
}

function Progress({ value = 0, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-progress', className), ...rest },
    React.createElement('div', { className: 'uk-progress__bar', style: { width: \`\${Math.max(0, Math.min(100, value))}%\` } }),
  );
}

function Chip({ children, className, onDelete, ...rest }) {
  return React.createElement('span', { className: cx('uk-chip', className), ...rest },
    children,
    onDelete ? React.createElement('button', { type: 'button', className: 'uk-chip__x', onClick: onDelete }, '×') : null,
  );
}
function Badge({ children, className, ...rest }) {
  return React.createElement('span', { className: cx('uk-badge', className), ...rest }, children);
}
function Alert({ children, className, color, ...rest }) {
  return React.createElement('div', { className: cx('uk-alert', color && \`uk-alert--\${color}\`, className), role: 'alert', ...rest }, children);
}
function Card({ children, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-card', className), ...rest }, children);
}
function List({ children, className, ...rest }) {
  return React.createElement('ul', { className: cx('uk-list', className), ...rest }, children);
}
function ListItem({ children, className, ...rest }) {
  return React.createElement('li', { className: cx('uk-list__item', className), ...rest }, children);
}
function Accordion({ children, className, title, ...rest }) {
  return React.createElement('details', { className: cx('uk-accordion', className), ...rest },
    React.createElement('summary', null, title || 'Section'),
    React.createElement('div', null, children),
  );
}
function Avatar({ children, className, src, alt, ...rest }) {
  if (src) return React.createElement('img', { className: cx('uk-avatar', className), src, alt: alt || '', ...rest });
  return React.createElement('span', { className: cx('uk-avatar', className), ...rest }, children);
}
function Backdrop({ className, ...rest }) {
  return React.createElement('div', { className: cx('uk-backdrop', className), ...rest });
}
function Breadcrumbs({ items = [], children, className, ...rest }) {
  return React.createElement('nav', { className: cx('uk-breadcrumbs', className), ...rest },
    children || items.map((it, i) => React.createElement('span', { key: i }, typeof it === 'string' ? it : it?.label)),
  );
}
function CroppedText({ children, className, ...rest }) {
  return React.createElement('span', { className: cx('uk-cropped', className), ...rest }, children);
}
function IconButton({ children, className, ...rest }) {
  return React.createElement('button', { type: 'button', className: cx('uk-icon-btn', className), ...rest }, children);
}
function ToggleButton({ children, className, selected, ...rest }) {
  return React.createElement('button', {
    type: 'button',
    className: cx('uk-toggle-btn', selected && 'uk-toggle-btn--on', className),
    ...rest,
  }, children);
}
function DatePicker({ value, onChange, className, ...rest }) {
  return React.createElement('input', {
    type: 'date',
    className: cx('uk-input', className),
    value: value || '',
    onChange,
    ...rest,
  });
}
function DateRangePicker({ className, ...rest }) {
  return React.createElement('div', { className: cx('uk-daterange', className), ...rest },
    React.createElement(DatePicker, null),
    React.createElement('span', null, '—'),
    React.createElement(DatePicker, null),
  );
}
function TimePicker({ value, onChange, className, ...rest }) {
  return React.createElement('input', { type: 'time', className: cx('uk-input', className), value: value || '', onChange, ...rest });
}
function ColorPicker({ value, onChange, className, ...rest }) {
  return React.createElement('input', { type: 'color', className: cx('uk-color', className), value: value || '#148F5C', onChange, ...rest });
}
function PopConfirm({ children, title, onConfirm, ...rest }) {
  return React.createElement('span', rest, children, title ? React.createElement('span', { className: 'uk-popconfirm', onClick: onConfirm }, title) : null);
}

function makeSimple(tag, baseClass) {
  return function Simple({ children, className, ...rest }) {
    return React.createElement(tag, { className: cx(baseClass, className), ...rest }, children);
  };
}

${names
  .filter((n) => !TYPE_ONLY.has(n) && !ICON_NAMES.includes(n) && !CONST_ENUMS[n] && !ALIAS_CONST[n] && !SPECIAL_CONST[n] && !THEME_NAMES.has(n) && !COMPONENT_SPECIAL.has(n) && n !== 'Icon' && n !== 'ThemeProvider' && n !== 'NotificationsProvider')
  .map((n) => `const ${n} = makeSimple('div', 'uk-box'); ${n}.displayName = '${n}';`)
  .join('\n')}

${[...TYPE_ONLY].map((n) => `const ${n} = undefined;`).join('\n')}

const api = {
${names.map((n) => `  ${n},`).join('\n')}
};

module.exports = api;
`;

// Fix Pagination typo - I wrote broken JSX-like in createElement
const fixedIndex = indexJs.replace(
  `React.createElement('button', type: 'button', disabled: page >= count, onClick: () => onChange && onChange(page + 1) }, '›'),`,
  `React.createElement('button', { type: 'button', disabled: page >= count, onClick: () => onChange && onChange(page + 1) }, '›'),`,
);

const styleCss = `/* ui-kit compat styles — близко к админскому bootstrap/enterprise look */
.uk-root {
  color: var(--uk-text, #1c2430);
  background: var(--uk-bg, #f5f7f9);
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  min-height: 100%;
}
.uk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 14px;
  background: var(--uk-primary, #148f5c);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.uk-btn:disabled { opacity: .55; cursor: not-allowed; }
.uk-btn--outlined, .uk-btn--outline {
  background: transparent;
  color: var(--uk-primary, #148f5c);
  border-color: var(--uk-primary, #148f5c);
}
.uk-btn--text, .uk-btn--link {
  background: transparent;
  color: var(--uk-primary, #148f5c);
  border-color: transparent;
}
.uk-btn--block { width: 100%; }
.uk-btn--small, .uk-btn--x-small { padding: 4px 10px; font-size: 12px; }
.uk-btn--large, .uk-btn--x-large { padding: 12px 18px; font-size: 16px; }
.uk-btn--color-secondary { background: var(--uk-secondary, #2b3a4a); }
.uk-btn--color-error { background: var(--uk-error, #d14343); }
.uk-field { display: flex; flex-direction: column; gap: 4px; }
.uk-field--block { width: 100%; }
.uk-field__label { color: var(--uk-muted, #6b7785); font-size: 12px; }
.uk-field__hint { color: var(--uk-muted, #6b7785); font-size: 12px; }
.uk-input-wrap {
  display: flex; align-items: center; gap: 6px;
  background: var(--uk-surface, #fff);
  border: 1px solid var(--uk-border, #d7dee7);
  border-radius: 8px;
  padding: 0 10px;
}
.uk-input-wrap--error { border-color: var(--uk-error, #d14343); }
.uk-input, .uk-textarea, .uk-select {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  padding: 9px 0;
  color: inherit;
}
.uk-textarea {
  border: 1px solid var(--uk-border, #d7dee7);
  border-radius: 8px;
  padding: 10px;
  background: var(--uk-surface, #fff);
  min-height: 84px;
}
.uk-check, .uk-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.uk-switch__track {
  width: 36px; height: 20px; border-radius: 999px;
  background: var(--uk-border, #d7dee7); position: relative; display: inline-block;
}
.uk-switch input { position: absolute; opacity: 0; }
.uk-switch input:checked + .uk-switch__track { background: var(--uk-primary, #148f5c); }
.uk-icon { display: inline-block; vertical-align: middle; flex: none; }
.uk-icon-btn {
  border: 0; background: transparent; border-radius: 8px; padding: 6px; cursor: pointer; color: inherit;
}
.uk-icon-btn:hover { background: rgba(20, 143, 92, 0.08); }
.uk-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(20,143,92,.25); border-top-color: var(--uk-primary, #148f5c);
  display: inline-block; animation: uk-spin .7s linear infinite;
}
@keyframes uk-spin { to { transform: rotate(360deg); } }
.uk-stack { display: flex; gap: 8px; }
.uk-stack--row { flex-direction: row; }
.uk-stack--column { flex-direction: column; }
.uk-grid { display: grid; gap: 12px; }
.uk-typo { margin: 0; color: inherit; }
.uk-typo--h1 { font-size: 28px; font-weight: 700; }
.uk-typo--h2 { font-size: 22px; font-weight: 700; }
.uk-typo--h3 { font-size: 18px; font-weight: 650; }
.uk-typo--caption { font-size: 12px; color: var(--uk-muted, #6b7785); }
.uk-modal { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; }
.uk-modal__backdrop { position: absolute; inset: 0; background: rgba(18, 24, 32, .45); }
.uk-modal__panel {
  position: relative; z-index: 1; min-width: min(480px, 92vw);
  background: var(--uk-surface, #fff); border-radius: 12px; padding: 16px 18px;
  box-shadow: 0 16px 48px rgba(18,24,32,.18); border: 1px solid var(--uk-border, #d7dee7);
}
.uk-modal__title { font-weight: 700; margin-bottom: 10px; }
.uk-card {
  background: var(--uk-surface, #fff); border: 1px solid var(--uk-border, #d7dee7);
  border-radius: 12px; padding: 14px;
}
.uk-alert {
  border-radius: 10px; padding: 10px 12px; background: #e8f6ef; color: var(--uk-text, #1c2430);
  border: 1px solid #bfe6d2;
}
.uk-alert--error { background: #fdecec; border-color: #f3c1c1; }
.uk-alert--warning { background: #fff6e5; border-color: #f0d7a3; }
.uk-badge, .uk-chip {
  display: inline-flex; align-items: center; gap: 4px;
  border-radius: 999px; padding: 2px 8px; font-size: 12px;
  background: rgba(20,143,92,.12); color: var(--uk-primary, #148f5c);
}
.uk-chip__x { border: 0; background: transparent; cursor: pointer; }
.uk-table { width: 100%; border-collapse: collapse; background: var(--uk-surface, #fff); }
.uk-table th, .uk-table td { border-bottom: 1px solid var(--uk-border, #d7dee7); padding: 8px 10px; text-align: left; }
.uk-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--uk-border, #d7dee7); }
.uk-tab {
  border: 0; background: transparent; padding: 8px 12px; cursor: pointer; color: var(--uk-muted, #6b7785);
  border-bottom: 2px solid transparent;
}
.uk-tab--active { color: var(--uk-primary, #148f5c); border-bottom-color: var(--uk-primary, #148f5c); font-weight: 600; }
.uk-list { list-style: none; margin: 0; padding: 0; }
.uk-list__item { padding: 8px 10px; border-bottom: 1px solid var(--uk-border, #d7dee7); }
.uk-avatar {
  width: 32px; height: 32px; border-radius: 50%; object-fit: cover;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(20,143,92,.15); color: var(--uk-primary, #148f5c); font-weight: 700;
}
.uk-backdrop { position: fixed; inset: 0; background: rgba(18,24,32,.35); }
.uk-breadcrumbs { display: flex; gap: 8px; color: var(--uk-muted, #6b7785); }
.uk-cropped {
  display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.uk-progress {
  height: 8px; border-radius: 999px; background: var(--uk-border, #d7dee7); overflow: hidden;
}
.uk-progress__bar { height: 100%; background: var(--uk-primary, #148f5c); }
.uk-pagination { display: inline-flex; gap: 8px; align-items: center; }
.uk-pagination button {
  border: 1px solid var(--uk-border, #d7dee7); background: var(--uk-surface, #fff);
  border-radius: 6px; width: 28px; height: 28px; cursor: pointer;
}
.uk-toggle-btn {
  border: 1px solid var(--uk-border, #d7dee7); background: var(--uk-surface, #fff);
  border-radius: 8px; padding: 6px 10px; cursor: pointer;
}
.uk-toggle-btn--on { background: rgba(20,143,92,.12); border-color: var(--uk-primary, #148f5c); color: var(--uk-primary, #148f5c); }
.uk-dropdown, .uk-popover { position: relative; display: inline-block; }
.uk-dropdown__menu, .uk-popover__content {
  position: absolute; top: 100%; left: 0; z-index: 20; min-width: 160px;
  background: var(--uk-surface, #fff); border: 1px solid var(--uk-border, #d7dee7);
  border-radius: 8px; box-shadow: 0 8px 24px rgba(18,24,32,.12); padding: 6px;
}
.uk-dropdown__item { padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.uk-dropdown__item:hover { background: rgba(20,143,92,.08); }
.uk-accordion summary { cursor: pointer; font-weight: 600; padding: 8px 0; }
.uk-box { display: contents; }
`;

const pkg = {
  name: 'ui-kit',
  version: '1.6.17-compat.0',
  description: 'Sreda Analytics ui-kit compatibility layer for admin (replace with real vendors/ui-kit/*.tgz when available)',
  main: 'index.js',
  types: 'index.d.ts',
  style: 'style.css',
  files: ['index.js', 'index.d.ts', 'style.css', 'README.md'],
  peerDependencies: {
    react: '>=17',
    'react-dom': '>=17',
  },
  sredaCompat: true,
  license: 'UNLICENSED',
};

const dts = `import type * as React from 'react';
${names.map((n) => `export declare const ${n}: any;`).join('\n')}
export {};
`;

const readme = `# ui-kit compat (Sreda Analytics)

Временный drop-in вместо корпоративного \`ui-kit\` для внешней/локальной поставки админки.

- API-имена совпадают с импортами админки (\`Button\`, \`ThemeProvider\`, иконки, константы).
- Внешний вид — нейтральный enterprise (зелёный primary), без жёсткой привязки к Сбер UI.
- **Не перетирает** боевой пакет: коробка кладёт tgz в \`frontend-adm/vendors/ui-kit/\` только если файла ещё нет.

Замена на боевой:
1. Положить настоящий \`ui-kit-1.6.17.tgz\` в \`workspace/frontend-adm/vendors/ui-kit/\`
2. \`rm -rf node_modules/ui-kit && npm install\`
`;

fs.writeFileSync(path.join(outDir, 'index.js'), fixedIndex);
fs.writeFileSync(path.join(outDir, 'style.css'), styleCss);
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'index.d.ts'), dts);
fs.writeFileSync(path.join(outDir, 'README.md'), readme);
console.log('wrote', outDir, 'exports', names.length);
