import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyUnit, formatMoney } from '../utilities/money';
import { formatJalaliDate, formatJalaliDateTime } from '../utilities/jalali-date';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(rial: number | null | undefined, unit: CurrencyUnit = 'toman'): string {
    return formatMoney(rial, unit);
  }
}

@Pipe({ name: 'jdate' })
export class JalaliDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, withTime = false): string {
    return withTime ? formatJalaliDateTime(value) : formatJalaliDate(value);
  }
}
