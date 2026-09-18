/* sreda ui-kit compat — drop-in для админки, пока нет боевого vendors/ui-kit/*.tgz */
'use strict';
const React = require('react');

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function enumOf(values) {
  return Object.freeze(Object.fromEntries(values.map((v) => [v, v.toLowerCase().replace(/_/g, '-')]))); 
}

const BUTTON_COLOR = enumOf(["PRIMARY","SECONDARY","SUCCESS","WARNING","ERROR","INFO","INHERIT"]);
const BUTTON_SIZE = enumOf(["X_LARGE","LARGE","MEDIUM","SMALL","X_SMALL"]);
const BUTTON_TYPE = enumOf(["BUTTON","SUBMIT","RESET"]);
const BUTTON_VARIANT = enumOf(["CONTAINED","OUTLINED","TEXT","LINK"]);
const INPUT_STATUS = enumOf(["DEFAULT","ERROR","SUCCESS","WARNING"]);
const INPUT_TYPE = enumOf(["TEXT","PASSWORD","NUMBER","EMAIL","SEARCH","TEL","URL"]);
const INPUT_VARIANT = enumOf(["OUTLINED","CONTAINED","STANDARD"]);
const SELECT_STATUS = enumOf(["DEFAULT","ERROR","SUCCESS","WARNING"]);
const SELECT_VARIANT = enumOf(["OUTLINED","CONTAINED"]);
const TEXTAREA_STATUS = enumOf(["DEFAULT","ERROR","SUCCESS","WARNING"]);
const TEXTAREA_VARIANT = enumOf(["OUTLINED","CONTAINED"]);
const ICON_COLOR = enumOf(["TEXT","ERROR","PRIMARY","SECONDARY","SUCCESS","WARNING","ICON","WHITE"]);
const ICON_SIZE = enumOf(["X_LARGE","LARGE","MEDIUM","SMALL","X_SMALL"]);
const LOADER_COLOR = enumOf(["PRIMARY","SECONDARY","WHITE","INHERIT"]);
const LOADER_SIZE = enumOf(["LARGE","MEDIUM","SMALL"]);
const BADGE_COLOR = enumOf(["PRIMARY","SECONDARY","SUCCESS","WARNING","ERROR","INFO"]);
const BADGE_VARIANT = enumOf(["FILLED","OUTLINED","DOT"]);
const CHIP_COLOR = enumOf(["PRIMARY","SECONDARY","SUCCESS","WARNING","ERROR","DEFAULT"]);
const CHIP_SIZE = enumOf(["LARGE","MEDIUM","SMALL"]);
const CHIP_VARIANT = enumOf(["FILLED","OUTLINED"]);
const ALERT_COLOR = enumOf(["INFO","SUCCESS","WARNING","ERROR"]);
const AVATAR_SIZE = enumOf(["LARGE","MEDIUM","SMALL"]);
const ACCORDION_ICON_POSITION = enumOf(["START","END"]);
const TABS_VARIANT = enumOf(["STANDARD","SCROLLABLE","FULL_WIDTH"]);
const TOGGLE_BUTTON_SIZE = enumOf(["LARGE","MEDIUM","SMALL"]);
const PROGRESS_COLOR = enumOf(["PRIMARY","SECONDARY","SUCCESS","WARNING","ERROR"]);
const PROGRESS_SIZE = enumOf(["LARGE","MEDIUM","SMALL"]);
const PROGRESS_VARIANT = enumOf(["DETERMINATE","INDETERMINATE"]);
const LIST_TYPE = enumOf(["UL","OL"]);
const LIST_ITEM_STATUS = enumOf(["DEFAULT","SELECTED","DISABLED"]);
const LIST_ITEM_TYPE = enumOf(["DEFAULT","BUTTON","LINK"]);
const STACK_DIRECTION = enumOf(["ROW","COLUMN","ROW_REVERSE","COLUMN_REVERSE"]);
const STACK_ALIGN_ITEM = enumOf(["START","CENTER","END","STRETCH","BASELINE"]);
const STACK_JUSTIFY_CONTENT = enumOf(["START","CENTER","END","SPACE_BETWEEN","SPACE_AROUND","SPACE_EVENLY"]);
const STACK_WRAP = enumOf(["NOWRAP","WRAP","WRAP_REVERSE"]);
const GRID_ALIGN_CONTENT = enumOf(["START","CENTER","END","STRETCH","SPACE_BETWEEN","SPACE_AROUND"]);
const GRID_ALIGN_ITEMS = enumOf(["START","CENTER","END","STRETCH"]);
const GRID_AUTO_FLOW = enumOf(["ROW","COLUMN","DENSE"]);
const GRID_JUSTIFY_CONTENT = enumOf(["START","CENTER","END","SPACE_BETWEEN","SPACE_AROUND"]);
const GRID_JUSTIFY_ITEMS = enumOf(["START","CENTER","END","STRETCH"]);
const GRID_ELEMENT_ALIGN_SELF = enumOf(["AUTO","START","CENTER","END","STRETCH"]);
const GRID_ELEMENT_JUSTIFY_SELF = enumOf(["AUTO","START","CENTER","END","STRETCH"]);
const TYPOGRAPHY_COLOR = enumOf(["PRIMARY","SECONDARY","TEXT","ERROR","SUCCESS","WARNING","INHERIT"]);
const TYPOGRAPHY_VARIANT = enumOf(["H1","H2","H3","H4","H5","H6","BODY1","BODY2","CAPTION","OVERLINE","SUBTITLE1","SUBTITLE2"]);
const TYPOGRAPHY_WEIGHT = enumOf(["LIGHT","REGULAR","MEDIUM","BOLD"]);
const ButtonColors = BUTTON_COLOR;
const ButtonVariants = BUTTON_VARIANT;
const InputStatuses = INPUT_STATUS;
const InputTypes = INPUT_TYPE;
const InputVariants = INPUT_VARIANT;
const MAX_MINUTE = 59;
const SEPARATOR = "/";

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
      className: cx('uk-icon', color && `uk-icon--${color}`, className),
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
const LOCK_PATH =
  'M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zM9 6a3 3 0 116 0v2H9V6zm3 11a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z';
const AccessGiveIcon = makeIcon('AccessGiveIcon', ICON_PATH);
const AccessLockIcon = makeIcon('AccessLockIcon', LOCK_PATH);
const ArrowDownIcon = makeIcon('ArrowDownIcon', ICON_PATH);
const ArrowLeftIcon = makeIcon('ArrowLeftIcon', ICON_PATH);
const ArrowUpIcon = makeIcon('ArrowUpIcon', ICON_PATH);
const AttachmentIcon = makeIcon('AttachmentIcon', ICON_PATH);
const AxisIcon = makeIcon('AxisIcon', ICON_PATH);
const BottomIcon = makeIcon('BottomIcon', ICON_PATH);
const CalculateIcon = makeIcon('CalculateIcon', ICON_PATH);
const CatalogIcon = makeIcon('CatalogIcon', ICON_PATH);
const ClearIcon = makeIcon('ClearIcon', ICON_PATH);
const CloseIcon = makeIcon('CloseIcon', ICON_PATH);
const ControllIcon = makeIcon('ControllIcon', ICON_PATH);
const CopyIcon = makeIcon('CopyIcon', ICON_PATH);
const DefaultIcon = makeIcon('DefaultIcon', ICON_PATH);
const DeleteIcon = makeIcon('DeleteIcon', ICON_PATH);
const DownloadIcon = makeIcon('DownloadIcon', ICON_PATH);
const DragDropDotIcon = makeIcon('DragDropDotIcon', ICON_PATH);
const DropDownIcon = makeIcon('DropDownIcon', ICON_PATH);
const DropUpIcon = makeIcon('DropUpIcon', ICON_PATH);
const DublicateIcon = makeIcon('DublicateIcon', ICON_PATH);
const EditIcon = makeIcon('EditIcon', ICON_PATH);
const ElectricityIcon = makeIcon('ElectricityIcon', ICON_PATH);
const EraseIcon = makeIcon('EraseIcon', ICON_PATH);
const EyeIcon = makeIcon('EyeIcon', ICON_PATH);
const FileIcon = makeIcon('FileIcon', ICON_PATH);
const FolderIcon = makeIcon('FolderIcon', ICON_PATH);
const HelpIcon = makeIcon('HelpIcon', ICON_PATH);
const IndicatorBarIcon = makeIcon('IndicatorBarIcon', ICON_PATH);
const LabelsIcon = makeIcon('LabelsIcon', ICON_PATH);
const LeftIcon = makeIcon('LeftIcon', ICON_PATH);
const ListAddIcon = makeIcon('ListAddIcon', ICON_PATH);
const MoreIcon = makeIcon('MoreIcon', ICON_PATH);
const PlusIcon = makeIcon('PlusIcon', ICON_PATH);
const PlusOutlineIcon = makeIcon('PlusOutlineIcon', ICON_PATH);
const ResetIcon = makeIcon('ResetIcon', ICON_PATH);
const RightIcon = makeIcon('RightIcon', ICON_PATH);
const SearchIcon = makeIcon('SearchIcon', ICON_PATH);
const SettingIcon = makeIcon('SettingIcon', ICON_PATH);
const SettingWrenchIcon = makeIcon('SettingWrenchIcon', ICON_PATH);
const SortArrowsIcon = makeIcon('SortArrowsIcon', ICON_PATH);
const SortAscIcon = makeIcon('SortAscIcon', ICON_PATH);
const SortDescIcon = makeIcon('SortDescIcon', ICON_PATH);
const SortIcon = makeIcon('SortIcon', ICON_PATH);
const SuccessIcon = makeIcon('SuccessIcon', ICON_PATH);
const SunMoonIcon = makeIcon('SunMoonIcon', ICON_PATH);
const TableDatasetAddIcon = makeIcon('TableDatasetAddIcon', ICON_PATH);
const TableIcon = makeIcon('TableIcon', ICON_PATH);
const UpdateIcon = makeIcon('UpdateIcon', ICON_PATH);
const UploadIcon = makeIcon('UploadIcon', ICON_PATH);
const UsersIcon = makeIcon('UsersIcon', ICON_PATH);
const WindowFrameIcon = makeIcon('WindowFrameIcon', ICON_PATH);

/** Элемент или тип компонента (forwardRef) → валидный React node */
function asNode(node) {
  if (node == null || node === false || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return node;
  if (React.isValidElement(node)) return node;
  if (typeof node === 'function' || (typeof node === 'object' && node.$$typeof)) {
    return React.createElement(node);
  }
  return null;
}

function Button({ children, className, variant, color, size, fullWidth, disabled, loading, type = 'button', leftIcon, rightIcon, startIcon, endIcon, onClick, style, ...rest }) {
  const v = String(variant || 'contained').toLowerCase();
  const c = String(color || 'primary').toLowerCase();
  return React.createElement(
    'button',
    {
      type,
      className: cx(
        'uk-btn',
        `uk-btn--${v}`,
        `uk-btn--color-${c}`,
        size && `uk-btn--${String(size).toLowerCase()}`,
        fullWidth && 'uk-btn--block',
        loading && 'uk-btn--loading',
        className,
      ),
      disabled: disabled || loading,
      onClick,
      style,
      ...rest,
    },
    asNode(leftIcon || startIcon),
    loading ? React.createElement('span', { className: 'uk-spinner' }) : null,
    children,
    asNode(rightIcon || endIcon),
  );
}

function Input({ className, variant, status, type = 'text', fullWidth, hint, label, error, value, defaultValue, onChange, onBlur, disabled, placeholder, style, leftIcon, rightIcon, startIcon, endIcon, rounded, name, onClickRightIcon, onClickLeftIcon, ...rest }) {
  const st = status ? String(status).toLowerCase() : null;
  const v = variant ? String(variant).toLowerCase() : 'outlined';
  const left = asNode(leftIcon || startIcon);
  const right = asNode(rightIcon || endIcon);
  return React.createElement(
    'div',
    { className: cx('uk-field', fullWidth && 'uk-field--block', className), style },
    label ? React.createElement('span', { className: 'uk-field__label' }, label) : null,
    React.createElement(
      'div',
      { className: cx('uk-input-wrap', `uk-input-wrap--${v}`, st && `uk-input-wrap--${st}`, rounded && 'uk-input-wrap--rounded') },
      left
        ? React.createElement('span', {
            className: 'uk-input-icon uk-input-icon--left',
            onClick: onClickLeftIcon,
            role: onClickLeftIcon ? 'button' : undefined,
          }, left)
        : null,
      React.createElement('input', {
        className: 'uk-input',
        type: type || 'text',
        name,
        value: value ?? '',
        defaultValue,
        onChange,
        onBlur,
        disabled,
        placeholder,
        ...rest,
      }),
      right
        ? React.createElement('span', {
            className: 'uk-input-icon uk-input-icon--right',
            onClick: onClickRightIcon,
            role: onClickRightIcon ? 'button' : undefined,
            style: onClickRightIcon ? { cursor: 'pointer' } : undefined,
          }, right)
        : null,
    ),
    (error || hint) ? React.createElement('span', { className: cx('uk-field__hint', st === 'error' && 'uk-field__hint--error') }, error || hint) : null,
  );
}

function TextArea({ className, variant, status, label, hint, error, fullWidth, ...rest }) {
  return React.createElement(
    'label',
    { className: cx('uk-field', fullWidth && 'uk-field--block', className) },
    label ? React.createElement('span', { className: 'uk-field__label' }, label) : null,
    React.createElement('textarea', {
      className: cx('uk-textarea', variant && `uk-textarea--${variant}`, status && `uk-textarea--${status}`),
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
    className: cx('uk-spinner', size && `uk-spinner--${size}`, color && `uk-spinner--${color}`, className),
    'aria-label': 'loading',
    ...rest,
  });
}

function Stack({ className, direction = 'column', alignItems, justifyContent, wrap, gap, spacing, children, style, ...rest }) {
  const dir = String(direction).toLowerCase().replace(/_/g, '-');
  return React.createElement(
    'div',
    {
      className: cx('uk-stack', `uk-stack--${dir}`, className),
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
  const v = String(variant || '');
  const tag =
    component ||
    (/^h[1-6]$/i.test(v) ? v.toLowerCase() :
      /^heading([1-6])$/i.test(v) ? `h${RegExp.$1}` :
      v === 'H1' || v === 'h1' ? 'h1' : v === 'H2' || v === 'h2' ? 'h2' :
      v === 'H3' || v === 'h3' ? 'h3' : v === 'H4' || v === 'h4' ? 'h4' :
      v === 'H5' || v === 'h5' ? 'h5' : v === 'H6' || v === 'h6' ? 'h6' : 'p');
  return React.createElement(tag, {
    className: cx('uk-typo', variant && `uk-typo--${v.toLowerCase()}`, color && `uk-typo--${color}`, weight && `uk-typo--w-${weight}`, className),
    style,
    ...rest,
  }, children);
}

function Modal({
  open,
  isOpen,
  visible,
  opened,
  onClose,
  onCancel,
  onSetOpen,
  children,
  className,
  classNames,
  title,
  actions,
  closeByOutsideClick = true,
  lockScroll,
  testId,
  style,
  ...rest
}) {
  const shown = opened ?? open ?? isOpen ?? visible ?? false;
  if (!shown) return null;
  const close = () => {
    if (typeof onSetOpen === 'function') onSetOpen(false);
    const fn = onClose || onCancel;
    if (typeof fn === 'function') fn();
  };
  return React.createElement(
    'div',
    { className: 'uk-modal', role: 'dialog', 'data-testid': testId, ...rest },
    React.createElement('div', {
      className: 'uk-modal__backdrop',
      onClick: closeByOutsideClick ? close : undefined,
    }),
    React.createElement(
      'div',
      { className: cx('uk-modal__panel', className, classNames), style },
      title ? React.createElement('div', { className: 'uk-modal__title' }, title) : null,
      React.createElement('div', { className: 'uk-modal__body' }, children),
      actions ? React.createElement('div', { className: 'uk-modal__actions' }, actions) : null,
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

function Dropdown({ children, options, className, leftIcon, rightIcon, open: openProp, variant, color, size, style, onMouseDown, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const shown = openProp != null ? openProp : open;
  return React.createElement(
    'div',
    { className: cx('uk-dropdown', className), style, onMouseDown, ...rest },
    React.createElement(
      'button',
      {
        type: 'button',
        className: cx(
          'uk-btn',
          `uk-btn--${String(variant || 'outlined').toLowerCase()}`,
          color && `uk-btn--color-${String(color).toLowerCase()}`,
          size && `uk-btn--${String(size).toLowerCase()}`,
        ),
        onClick: () => setOpen((v) => !v),
      },
      asNode(leftIcon),
      children,
      asNode(rightIcon),
    ),
    shown && Array.isArray(options)
      ? React.createElement(
          'div',
          { className: 'uk-dropdown__menu' },
          options.map((opt, i) =>
            React.createElement(
              'div',
              {
                key: opt?.value ?? i,
                className: 'uk-dropdown__item',
                onClick: () => {
                  if (typeof opt?.onClick === 'function') opt.onClick();
                  setOpen(false);
                },
              },
              opt?.label ?? String(opt),
            ),
          ),
        )
      : null,
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
function TreeItemRow({ node, onNodeExpand, onNodeClick }) {
  const level = Number(node.level);
  const indent = (Number.isFinite(level) ? Math.max(0, level + 1) : 0) * 14;
  const iconCfg = node.icon || {};
  const IconComp = iconCfg.icon;
  return React.createElement(
    'div',
    {
      className: cx('tree-item-container', 'uk-tree-item', node.isSelected && 'uk-tree-item--selected'),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        paddingLeft: 6 + indent,
        cursor: 'pointer',
        userSelect: 'none',
        background: node.isSelected ? 'rgba(47,191,123,.18)' : 'transparent',
        color: 'var(--main-active-color, #1c2430)',
        borderRadius: 4,
      },
      onClick: (e) => {
        e.stopPropagation();
        if (typeof onNodeClick === 'function') onNodeClick(node);
      },
    },
    node.hasChildren
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'uk-tree-caret',
            style: {
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              width: 18,
              padding: 0,
              color: 'inherit',
              flex: 'none',
            },
            onClick: (e) => {
              e.stopPropagation();
              if (typeof onNodeExpand === 'function') onNodeExpand(node);
            },
          },
          node.loading ? '…' : node.opened ? '▾' : '▸',
        )
      : React.createElement('span', { style: { width: 18, flex: 'none' } }),
    IconComp
      ? React.createElement(IconComp, {
          color: iconCfg.color || 'secondary',
          size: iconCfg.size || 'medium',
        })
      : null,
    React.createElement(
      'span',
      {
        className: 'uk-tree-item__title',
        style: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        },
      },
      node.title ?? node.name ?? node.id,
    ),
  );
}

function TreeControlled({
  data,
  expandedNodes,
  onNodeExpand,
  onNodeClick,
  maxLevel,
  style,
  className,
  fallback,
  searchValue,
  onSearch,
  searchFn,
  children,
}) {
  let nodes = Array.isArray(data) ? data : [];
  if (searchValue && typeof searchFn === 'function') {
    try {
      const found = searchFn(data, searchValue);
      if (Array.isArray(found)) nodes = found;
    } catch (_) {
      /* ignore search errors in compat layer */
    }
  } else if (searchValue && typeof onSearch === 'function') {
    try {
      onSearch(searchValue);
    } catch (_) {
      /* ignore */
    }
  }

  const visible = nodes.filter((n) => n && (maxLevel == null || (n.level ?? 0) <= maxLevel));

  return React.createElement(
    'div',
    {
      className: cx('uk-tree', 'tree-cmp', className),
      style: { overflow: 'auto', ...style },
    },
    visible.length === 0
      ? fallback || null
      : visible.map((node) =>
          React.createElement(TreeItemRow, {
            key: node.id,
            node,
            onNodeExpand,
            onNodeClick,
          }),
        ),
    children,
  );
}
function TreeDataControlled(props) {
  return React.createElement(TreeControlled, props);
}

function Tabs({ children, className, value = 0, onChange, variant, ...rest }) {
  const items = React.Children.toArray(children);
  return React.createElement(
    'div',
    {
      className: cx('uk-tabs', variant && `uk-tabs--${String(variant).toLowerCase()}`, className),
      role: 'tablist',
      ...rest,
    },
    items.map((child, index) => {
      if (!React.isValidElement(child)) return child;
      const selected = Number(value) === index;
      return React.cloneElement(child, {
        key: child.key ?? index,
        selected,
        onClick: (e) => {
          if (typeof child.props.onClick === 'function') child.props.onClick(e);
          if (typeof onChange === 'function') onChange(index, e);
        },
      });
    }),
  );
}
function Tab({ children, className, selected, active, label, badge, disabled, ...rest }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: cx('uk-tab', (selected || active) && 'uk-tab--active', className),
      role: 'tab',
      'aria-selected': !!(selected || active),
      disabled,
      ...rest,
    },
    label != null ? label : children,
    badge != null && badge !== false && badge !== undefined
      ? React.createElement('span', { className: 'uk-badge uk-tab__badge' }, badge)
      : null,
  );
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
    React.createElement('span', null, `${page} / ${count}`),
    React.createElement('button', { type: 'button', disabled: page >= count, onClick: () => onChange && onChange(page + 1) }, '›'),
  );
}

function Progress({ value = 0, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-progress', className), ...rest },
    React.createElement('div', { className: 'uk-progress__bar', style: { width: `${Math.max(0, Math.min(100, value))}%` } }),
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
  return React.createElement('div', { className: cx('uk-alert', color && `uk-alert--${color}`, className), role: 'alert', ...rest }, children);
}
function Card({ children, className, ...rest }) {
  return React.createElement('div', { className: cx('uk-card', className), ...rest }, children);
}
function List({ children, className, options, type, ...rest }) {
  const fromOptions = Array.isArray(options)
    ? options.map((opt, i) =>
        React.createElement(
          'li',
          { key: opt?.id ?? opt?.value ?? i, className: 'uk-list__item' },
          typeof opt === 'string' || typeof opt === 'number'
            ? String(opt)
            : React.createElement(
                React.Fragment,
                null,
                React.createElement('div', { className: 'uk-list__label' }, opt?.label ?? opt?.name ?? String(opt)),
                opt?.hint
                  ? React.createElement('div', { className: 'uk-list__hint', style: { opacity: 0.7, fontSize: 12 } }, opt.hint)
                  : null,
              ),
        ),
      )
    : null;
  return React.createElement(
    'ul',
    { className: cx('uk-list', type && `uk-list--${type}`, className), ...rest },
    fromOptions || children,
  );
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
function IconButton({ children, className, icon, variant, rounded, color, size, ...rest }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: cx(
        'uk-icon-btn',
        variant && `uk-icon-btn--${String(variant).toLowerCase()}`,
        rounded && 'uk-icon-btn--rounded',
        color && `uk-icon-btn--${String(color).toLowerCase()}`,
        size && `uk-icon-btn--${String(size).toLowerCase()}`,
        className,
      ),
      ...rest,
    },
    asNode(icon),
    children,
  );
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
function PopConfirm({
  children,
  title,
  content,
  confirmLabel = 'Да',
  rejectLabel = 'Нет',
  onConfirm,
  onReject,
  containerFullWidth,
  className,
}) {
  const [open, setOpen] = React.useState(false);
  return React.createElement(
    'span',
    {
      className: cx('uk-popconfirm-wrap', className),
      style: {
        position: 'relative',
        display: containerFullWidth ? 'flex' : 'inline-flex',
        width: containerFullWidth ? '100%' : undefined,
      },
    },
    React.createElement('span', { onClick: () => setOpen(true), style: { display: 'inline-flex' } }, children),
    open
      ? React.createElement(
          'div',
          {
            className: 'uk-dropdown__menu',
            style: { minWidth: 180, right: 0, left: 'auto' },
            onClick: (e) => e.stopPropagation(),
          },
          React.createElement('div', { style: { padding: '4px 6px 8px', fontSize: 13 } }, content || title),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'uk-btn uk-btn--outlined uk-btn--small',
                onClick: () => {
                  setOpen(false);
                  if (typeof onReject === 'function') onReject();
                },
              },
              rejectLabel,
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'uk-btn uk-btn--contained uk-btn--color-primary uk-btn--small',
                onClick: () => {
                  setOpen(false);
                  if (typeof onConfirm === 'function') onConfirm();
                },
              },
              confirmLabel,
            ),
          ),
        )
      : null,
  );
}

function makeSimple(tag, baseClass) {
  return function Simple({ children, className, ...rest }) {
    return React.createElement(tag, { className: cx(baseClass, className), ...rest }, children);
  };
}



const AccordionProps = undefined;
const AlertProps = undefined;
const AvatarProps = undefined;
const BackdropProps = undefined;
const BadgeProps = undefined;
const BreadcrumbsProps = undefined;
const ButtonProps = undefined;
const CardProps = undefined;
const CheckboxProps = undefined;
const ChipProps = undefined;
const ColorPickerProps = undefined;
const CroppedTextProps = undefined;
const DatePickerProps = undefined;
const DateRangePickerProps = undefined;
const DateRangeValue = undefined;
const DateValue = undefined;
const DropdownOption = undefined;
const DropdownProps = undefined;
const FlatTreeNode = undefined;
const GridElementProps = undefined;
const GridProps = undefined;
const IconButtonProps = undefined;
const IconComponentProps = undefined;
const IconProps = undefined;
const InputProps = undefined;
const ListItemProps = undefined;
const ListOption = undefined;
const ListProps = undefined;
const LoaderProps = undefined;
const ModalProps = undefined;
const MultiSelectProps = undefined;
const NotificationsProviderProps = undefined;
const PaginationProps = undefined;
const PopoverProps = undefined;
const ProgressProps = undefined;
const RadioProps = undefined;
const SelectOption = undefined;
const SelectProps = undefined;
const StackProps = undefined;
const SwitchProps = undefined;
const TabProps = undefined;
const TabsProps = undefined;
const TextAreaProps = undefined;
const Theme = undefined;
const ThemeProviderProps = undefined;
const TimePickerProps = undefined;
const ToggleButtonProps = undefined;
const TooltipProps = undefined;
const TreeSelectOption = undefined;
const TypographyProps = undefined;

const api = {
  ACCORDION_ICON_POSITION,
  ALERT_COLOR,
  AVATAR_SIZE,
  AccessGiveIcon,
  AccessLockIcon,
  Accordion,
  AccordionProps,
  Alert,
  AlertProps,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  AttachmentIcon,
  Avatar,
  AvatarProps,
  AxisIcon,
  BADGE_COLOR,
  BADGE_VARIANT,
  BUTTON_COLOR,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  Backdrop,
  BackdropProps,
  Badge,
  BadgeProps,
  BottomIcon,
  Breadcrumbs,
  BreadcrumbsProps,
  Button,
  ButtonColors,
  ButtonProps,
  ButtonVariants,
  CHIP_COLOR,
  CHIP_SIZE,
  CHIP_VARIANT,
  CalculateIcon,
  Card,
  CardProps,
  CatalogIcon,
  Checkbox,
  CheckboxProps,
  Chip,
  ChipProps,
  ClearIcon,
  CloseIcon,
  ColorPicker,
  ColorPickerProps,
  ControllIcon,
  CopyIcon,
  CroppedText,
  CroppedTextProps,
  DARK_THEME,
  DatePicker,
  DatePickerProps,
  DateRangePicker,
  DateRangePickerProps,
  DateRangeValue,
  DateValue,
  DefaultIcon,
  DeleteIcon,
  DownloadIcon,
  DragDropDotIcon,
  Drawer,
  DropDownIcon,
  DropUpIcon,
  Dropdown,
  DropdownOption,
  DropdownProps,
  DublicateIcon,
  EditIcon,
  ElectricityIcon,
  EraseIcon,
  EyeIcon,
  FileIcon,
  FlatTreeNode,
  FolderIcon,
  GALAXY_THEME,
  GRID_ALIGN_CONTENT,
  GRID_ALIGN_ITEMS,
  GRID_AUTO_FLOW,
  GRID_ELEMENT_ALIGN_SELF,
  GRID_ELEMENT_JUSTIFY_SELF,
  GRID_JUSTIFY_CONTENT,
  GRID_JUSTIFY_ITEMS,
  Grid,
  GridElement,
  GridElementProps,
  GridProps,
  HelpIcon,
  ICON_COLOR,
  ICON_SIZE,
  INPUT_STATUS,
  INPUT_TYPE,
  INPUT_VARIANT,
  Icon,
  IconButton,
  IconButtonProps,
  IconComponentProps,
  IconProps,
  IndicatorBarIcon,
  Input,
  InputProps,
  InputStatuses,
  InputTypes,
  InputVariants,
  LIGHT_THEME,
  LIST_ITEM_STATUS,
  LIST_ITEM_TYPE,
  LIST_TYPE,
  LOADER_COLOR,
  LOADER_SIZE,
  LabelsIcon,
  LeftIcon,
  List,
  ListAddIcon,
  ListItem,
  ListItemProps,
  ListOption,
  ListProps,
  Loader,
  LoaderProps,
  Modal,
  ModalProps,
  MoreIcon,
  MultiSelect,
  MultiSelectProps,
  NotificationsProvider,
  NotificationsProviderProps,
  PROGRESS_COLOR,
  PROGRESS_SIZE,
  PROGRESS_VARIANT,
  Pagination,
  PaginationProps,
  PlusIcon,
  PlusOutlineIcon,
  PopConfirm,
  Popover,
  PopoverProps,
  Progress,
  ProgressProps,
  Radio,
  RadioProps,
  ResetIcon,
  RightIcon,
  SELECT_STATUS,
  SELECT_VARIANT,
  STACK_ALIGN_ITEM,
  STACK_DIRECTION,
  STACK_JUSTIFY_CONTENT,
  STACK_WRAP,
  SearchIcon,
  Select,
  SelectOption,
  SelectProps,
  SettingIcon,
  SettingWrenchIcon,
  SortArrowsIcon,
  SortAscIcon,
  SortDescIcon,
  SortIcon,
  Stack,
  StackProps,
  SuccessIcon,
  SunMoonIcon,
  Switch,
  SwitchProps,
  TABS_VARIANT,
  TEXTAREA_STATUS,
  TEXTAREA_VARIANT,
  TOGGLE_BUTTON_SIZE,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  TYPOGRAPHY_WEIGHT,
  Tab,
  TabProps,
  Table,
  TableBody,
  TableCell,
  TableDatasetAddIcon,
  TableHead,
  TableIcon,
  TableRow,
  Tabs,
  TabsProps,
  TextArea,
  TextAreaProps,
  Theme,
  ThemeProvider,
  ThemeProviderProps,
  TimePicker,
  TimePickerProps,
  ToggleButton,
  ToggleButtonProps,
  Tooltip,
  TooltipProps,
  TreeControlled,
  TreeDataControlled,
  TreeMultiSelect,
  TreeSelect,
  TreeSelectOption,
  Typography,
  TypographyProps,
  UpdateIcon,
  UploadIcon,
  UsersIcon,
  WindowFrameIcon,
};

module.exports = api;
