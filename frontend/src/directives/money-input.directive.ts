import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';

@Directive({
  selector: 'input[appMoneyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputDirective),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => MoneyInputDirective),
      multi: true
    }
  ]
})
export class MoneyInputDirective implements ControlValueAccessor, Validator {
  @Input() moneyMin = 0.01;

  private readonly element = inject(ElementRef<HTMLInputElement>).nativeElement;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.element.inputMode = 'decimal';
    this.element.autocomplete = 'off';
  }

  @HostListener('input')
  protected handleInput(): void {
    const sanitized = this.sanitize(this.element.value);
    if (sanitized !== this.element.value) this.element.value = sanitized;
    this.onChange(this.parse(sanitized));
  }

  @HostListener('blur')
  protected handleBlur(): void {
    this.onTouched();
    const value = this.parse(this.element.value);
    if (value !== null) this.element.value = value.toFixed(2);
  }

  writeValue(value: number | null | undefined): void {
    this.element.value = value && Number.isFinite(value) ? String(value) : '';
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'number' && value >= this.moneyMin
      ? null
      : { money: { min: this.moneyMin } };
  }

  private sanitize(value: string): string {
    const cleaned = value.replace(/[^\d.,]/g, '');
    const separatorIndex = cleaned.search(/[.,]/);
    if (separatorIndex === -1) return cleaned;

    const whole = cleaned.slice(0, separatorIndex) || '0';
    const separator = cleaned[separatorIndex];
    const decimals = cleaned
      .slice(separatorIndex + 1)
      .replace(/[.,]/g, '')
      .slice(0, 2);
    return `${whole}${separator}${decimals}`;
  }

  private parse(value: string): number | null {
    if (!value || value === '0.' || value === '0,') return null;
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return Math.round((parsed + Number.EPSILON) * 100) / 100;
  }
}
