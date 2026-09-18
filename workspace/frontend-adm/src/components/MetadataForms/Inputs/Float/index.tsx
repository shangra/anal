import cn from 'classnames';
import React, { type ChangeEvent, Component } from 'react';
import { CommonInput, type CommonInputProps } from 'components/CommonInput';
import { ErrorBoundary } from 'components/ErrorBoundary';
import style from '../style.module.css';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';

const DEFAULT_PRECISION = 2;
const THOUSAND_SEP = '\u00A0'; // non-breaking space

const EMPTY_VALUES = ['', '-', '.', '-.'] as const;

function stripSeparators(s: string): string {
  return s.replace(/[\s\u00A0]/g, '');
}

function normalizeRaw(inputVal: string): string {
  return stripSeparators(inputVal).replaceAll(',', '.');
}

function isEmptyValue(s: string): boolean {
  return EMPTY_VALUES.includes(s as (typeof EMPTY_VALUES)[number]);
}

function parseNumber(s: string): number {
  const num = Number(s);
  return Number.isNaN(num) ? 0 : num;
}

function formatWithSeparators(s: string): string {
  if (isEmptyValue(s)) return s;
  const parts = s.split('.');
  const intPart = parts[0] || '0';
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace(/-/g, '');
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEP);
  return sign + formatted + (parts[1] !== undefined ? `.${  parts[1]}` : '');
}

function posFormattedToRaw(formatted: string, pos: number): number {
  return stripSeparators(formatted.slice(0, pos)).length;
}

function posRawToFormatted(raw: string, pos: number): number {
  const dotPos = raw.indexOf('.');
  const signLen = raw.startsWith('-') ? 1 : 0;
  if (dotPos === -1) {
    return pos + Math.floor(Math.max(0, pos - signLen) / 3);
  }
  if (pos < dotPos) {
    return pos + Math.floor(Math.max(0, pos - signLen) / 3);
  }
  if (pos === dotPos) {
    const intDigits = dotPos - signLen;
    return dotPos + Math.max(0, Math.floor((intDigits - 1) / 3));
  }
  const intDigits = dotPos - signLen;
  const intFormattedLen = dotPos + Math.max(0, Math.floor((intDigits - 1) / 3));
  return intFormattedLen + 1 + (pos - dotPos - 1);
}

// Одна вставка символа в oldS даёт newS (длина +1). Индекс вставленного символа
function findSingleInsertIndex(oldS: string, newS: string): number | null {
  if (newS.length !== oldS.length + 1) return null;
  for (let i = 0; i < newS.length; i++) {
    if (newS.slice(0, i) + newS.slice(i + 1) === oldS) return i;
  }
  return null;
}

// Вставка цифры в середину дробной части даёт лишний символ; slice(0, prec) тогда
function collapseFractionalDigitInsert(
  oldPlain: string,
  normalizedRaw: string,
): string {
  if (!oldPlain.includes('.') || !normalizedRaw.includes('.'))
    return normalizedRaw;
  const oldParts = oldPlain.split('.');
  const newParts = normalizedRaw.split('.');
  if (oldParts[0] !== newParts[0]) return normalizedRaw;
  const oldDec = oldParts[1] ?? '';
  const newDec = newParts[1] ?? '';
  if (newDec.length !== oldDec.length + 1) return normalizedRaw;
  const insertPos = findSingleInsertIndex(oldDec, newDec);
  if (insertPos === null) return normalizedRaw;
  if (insertPos + 1 >= newDec.length) return normalizedRaw;
  const collapsedDec =
    newDec.slice(0, insertPos + 1) + newDec.slice(insertPos + 2);
  return `${newParts[0]  }.${  collapsedDec}`;
}

export interface IFloatInputProps extends Omit<
  CommonInputProps,
  'value' | 'onChange'
> {
  value: number;
  step?: number;
  precision?: number;
  table?: boolean;
  onChange?: (value: number) => void;
  isTable?: boolean;
}

interface IFloatInputState {
  displayValue: string;
  precision: number;
  step: number;
  isFocused: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  isTable?: boolean,
}


export class FloatContent extends Component<
  IFloatInputProps,
  IFloatInputState
> {
  private committedDisplayRef: { current: string };

  private committedCaretRawRef: { current: number | null };

  constructor(props: IFloatInputProps) {
    super(props);
    const precision = props.precision ?? DEFAULT_PRECISION;
    const value = parseNumber(String(props.value));
    const step = props.step ?? 10 ** -(props.precision ?? DEFAULT_PRECISION);
    const displayValue = String(value.toFixed(precision));
    this.committedDisplayRef = { current: displayValue };
    this.committedCaretRawRef = { current: null };
    this.state = {
      displayValue,
      precision,
      step,
      isFocused: false,
      inputRef: React.createRef(),
    };
  }

  private syncCommittedFromStateWhenBlurred(): void {
    if (!this.state.isFocused) {
      this.committedDisplayRef.current = this.state.displayValue;
      this.committedCaretRawRef.current = null;
    }
  }

  componentDidUpdate(prevProps: IFloatInputProps) {
    if (this.state.isFocused) return;
    const { precision, value, step } = this.props;
    const prec = precision ?? DEFAULT_PRECISION;
    const nextState: Partial<IFloatInputState> = {};
    if (prevProps.precision !== precision) {
      nextState.precision = prec;
      nextState.step = step ?? 10 ** -prec;
    }
    if (prevProps.value !== value || prevProps.precision !== precision) {
      const num = parseNumber(String(value));
      const newDisplay = String(num.toFixed(prec));
      if (newDisplay !== this.state.displayValue) {
        nextState.displayValue = newDisplay;
      }
    }
    if (Object.keys(nextState).length > 0) {
      this.setState(nextState as IFloatInputState, () => {
        this.syncCommittedFromStateWhenBlurred();
      });
    } else {
      this.syncCommittedFromStateWhenBlurred();
    }
  }

  onFocus = () => this.setState({ isFocused: true });

  private applyDisplayUpdate(
    newVal: string,
    caretFormatted: number,
    input: HTMLInputElement,
  ): void {
    this.committedDisplayRef.current = newVal;
    this.committedCaretRawRef.current = posFormattedToRaw(
      formatWithSeparators(newVal),
      caretFormatted,
    );
    this.setState({ displayValue: newVal }, () => {
      setTimeout(
        () => input.setSelectionRange(caretFormatted, caretFormatted),
        0,
      );
    });
  }

  onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const {key} = e;
    if (key.length === 1 && !/[\d.,\-]/.test(key)) {
      e.preventDefault();
      return;
    }
    const input = e.target as HTMLInputElement;
    const selStart = input.selectionStart ?? 0;
    const selLen = (input.selectionEnd ?? 0) - selStart;

    if (/^\d$/.test(key) && selLen === 0) {
      const domRaw = normalizeRaw(input.value);
      const committedRaw = normalizeRaw(this.committedDisplayRef.current);
      const dotPos = domRaw.indexOf('.');
      if (dotPos !== -1) {
        let selStartRaw = posFormattedToRaw(input.value, selStart);
        if (
          domRaw !== committedRaw &&
          this.committedCaretRawRef.current !== null
        ) {
          selStartRaw = this.committedCaretRawRef.current;
        }
        const base = this.formatRaw(committedRaw, this.state.precision);
        const baseDot = base.indexOf('.');
        if (baseDot === -1) return;
        const decIdx = selStartRaw - baseDot - 1;
        if (decIdx >= 0 && decIdx < this.state.precision) {
          e.preventDefault();
          const replaceAt = baseDot + 1 + decIdx;
          const nextVal = base.slice(0, replaceAt) + key + base.slice(replaceAt + 1);
          const nextCaretRaw = replaceAt + 1;
          const nextCaret = posRawToFormatted(nextVal, nextCaretRaw);
          this.applyDisplayUpdate(nextVal, nextCaret, input);
          this.props.onChange?.(parseNumber(nextVal));
          return;
        }
      }
    }

    // Backspace: при курсоре сразу после точки — перескакиваем через точку и удаляем последнюю цифру целой части
    if (key === 'Backspace' && selLen === 0) {
      const raw = normalizeRaw(input.value);
      const dotPos = raw.indexOf('.');
      const selStartRaw = posFormattedToRaw(input.value, selStart);
      if (dotPos !== -1 && selStartRaw === dotPos + 1) {
        e.preventDefault();
        const signLen = raw.startsWith('-') ? 1 : 0;
        const intPart = raw.slice(signLen, dotPos);
        if (intPart.length > 1 || (intPart.length === 1 && intPart !== '0')) {
          const newInt = intPart.length > 1 ? intPart.slice(0, -1) : '0';
          const sign = raw.startsWith('-') ? '-' : '';
          const decPart = raw
            .slice(dotPos + 1)
            .padEnd(this.state.precision, '0');
          const newVal = `${sign + newInt  }.${  decPart}`;
          const newCaretRaw = (sign + newInt).length;
          const newCaret = posRawToFormatted(newVal, newCaretRaw);
          this.applyDisplayUpdate(newVal, newCaret, input);
          this.props.onChange?.(parseNumber(newVal));
        }
        return;
      }
    }

    // Блокируем только добавление третьей цифры после точки (курсор в конце дробной части)
    if (/^\d$/.test(key)) {
      const dotPos = input.value.indexOf('.');
      if (
        dotPos !== -1 &&
        selStart === dotPos + 1 + this.state.precision &&
        selLen === 0
      ) {
        e.preventDefault();
      }
    }
  };

  onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const oldValue = this.state.displayValue;
    const inputVal = input.value;
    const raw = normalizeRaw(inputVal);
    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    const selStartRaw = posFormattedToRaw(inputVal, selStart);
    const prec = this.state.precision;
    const pad = '0'.repeat(prec);

    let newVal: string;
    let caretRawBasis = raw;
    let dotRestored = false;
    let leadingZeroReplaced = false;

    // Ввод только цифр (без точки) — полная замена на "N.00" (выделение целиком или вставка)
    const oldFormatted = formatWithSeparators(oldValue);
    const fullReplace = /^-?\d+$/.test(raw);
    if (fullReplace) {
      const num = parseInt(raw, 10);
      newVal = `${num  }.${  pad}`;
    }
    // "0.XX" + цифра: первый ноль заменяется на вводимое число ("40.00"→"4.00", "04.00"→"4.00")
    else if (
      (oldValue.startsWith('0.') || oldValue.startsWith('-0.')) &&
      raw.length === oldValue.length + 1 &&
      /^-?\d.*\./.test(raw)
    ) {
      const sign = raw.startsWith('-') ? '-' : '';
      const rest = raw.startsWith('-') ? raw.slice(1) : raw;
      const digit = rest[0] !== '0' ? rest[0] : rest[1];
      const decPart = oldValue.includes('.')
        ? oldValue.split('.')[1] || pad
        : pad;
      newVal = `${sign + digit  }.${  decPart}`;
      leadingZeroReplaced = true;
    }
    // Защита от удаления точки: "123.00" + Backspace → "12300" восстанавливаем в "123.00"
    else if (
      oldValue.includes('.') &&
      !raw.includes('.') &&
      !isEmptyValue(raw) &&
      !(selStart === 0 && selEnd === oldFormatted.length)
    ) {
      const dotPos = oldValue.indexOf('.');
      const intLen = dotPos;
      const decLen = oldValue.length - dotPos - 1;
      newVal =
        `${raw.slice(0, intLen) 
        }.${ 
        raw.slice(intLen, intLen + decLen).padEnd(decLen, '0')}`;
      dotRestored = true;
    } else {
      caretRawBasis = collapseFractionalDigitInsert(oldValue, raw);
      newVal = this.formatRaw(caretRawBasis, prec);
    }

    const newCaretRaw =
      fullReplace || leadingZeroReplaced
        ? newVal.indexOf('.')
        : dotRestored
          ? newVal.indexOf('.') + 1
          : this.computeCaret(oldValue, newVal, caretRawBasis, selStartRaw);
    const newCaret = posRawToFormatted(newVal, newCaretRaw);
    this.applyDisplayUpdate(newVal, newCaret, input);

    if (isEmptyValue(newVal)) {
      this.props.onChange?.(0);
      return;
    }
    this.props.onChange?.(parseNumber(newVal));
  };

  formatRaw(raw: string, prec: number): string {
    if (isEmptyValue(raw)) return raw;
    const parts = raw.split('.');
    const sign = (parts[0] || '').startsWith('-') ? '-' : '';
    const digits = (parts[0] || '0').replace(/-/g, '');
    const intPart = digits.replace(/^0+(\d)/, '$1') || '0';
    const decPart = (parts[1] || '').slice(0, prec).padEnd(prec, '0');
    return `${sign + intPart  }.${  decPart}`;
  }

  computeCaret(
    _oldVal: string,
    newVal: string,
    raw: string,
    selStart: number,
  ): number {
    const dotNew = newVal.indexOf('.');
    if (dotNew === -1) return Math.min(selStart, newVal.length);
    // Если в raw нет точки — добавили ".00", курсор в целой части
    if (!raw.includes('.')) {
      return Math.min(selStart, dotNew);
    }
    // Используем raw: selStart относится к значению на момент ввода
    const dotRaw = raw.indexOf('.');
    if (selStart <= dotRaw) return Math.min(selStart, dotNew);
    const decPos = selStart - dotRaw - 1;
    return dotNew + 1 + Math.min(decPos, this.state.precision);
  }

  onBlur = () => {
    const raw = this.state.displayValue.trim().replace(',', '.');
    let normalized = 0;
    if (!isEmptyValue(raw)) {
      normalized = parseNumber(raw);
    }
    const dv = normalized.toFixed(this.state.precision);
    this.committedDisplayRef.current = dv;
    this.committedCaretRawRef.current = null;
    this.props.onChange?.(normalized);
    this.setState({
      displayValue: dv,
      isFocused: false,
    });
  };

  onMouseDownRange = (value: number) => {
    const formatted = value.toFixed(this.state.precision);
    const parsed = parseFloat(formatted);
    this.committedDisplayRef.current = formatted;
    this.committedCaretRawRef.current = null;
    this.props.onChange?.(parsed);
    this.setState({ displayValue: formatted });
  };

  onClear = () => {
    const clearedValue = 0;
    const formatted = clearedValue.toFixed(this.state.precision);
    this.committedDisplayRef.current = formatted;
    this.committedCaretRawRef.current = null;
    this.props.onChange?.(clearedValue);
    this.setState({
      displayValue: formatted,
      isFocused: false,
    });
    this.props.onClear?.();
  };

  render() {
    return (
      <ErrorBoundary
        downloadLogs={{
          logObj: { props: this.props, state: this.state },
          fileName: generateLogsFileName('FloatContent'),
        }}
      >
        <div
          className={cn(
            style.commonInputWrapper,
            this.props.containerClassName,
          )}
        >
          <CommonInput
            {...this.props}
            ref={this.state.inputRef}
            value={formatWithSeparators(this.state.displayValue)}
            numericValue={parseNumber(this.state.displayValue)}
            step={this.state.step}
            type="text"
            rangeButton
            deleteButton
            onChange={this.onChange}
            onMouseDownRange={this.onMouseDownRange}
            onClear={this.onClear}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
            onKeyDown={this.onKeyDown}
            isTable={this.props.isTable}
          />
        </div>
      </ErrorBoundary>
    );
  }
}


export class Float extends Component<IFloatInputProps> {
  render(): JSX.Element {
    return (
      <ErrorBoundary
        downloadLogs={{
          logObj: { props: this.props, state: {} },
          fileName: generateLogsFileName('MetadataForms_Inputs_Float'),
        }}
      >
        <FloatContent {...this.props} />
      </ErrorBoundary>
    );
  }
}