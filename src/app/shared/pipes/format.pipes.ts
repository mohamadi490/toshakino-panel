import { Pipe, PipeTransform } from '@angular/core';
import { formatJalaliDate, formatJalaliDateTime } from '../utilities/jalali-date';
import { formatMoney } from '../utilities/money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  /** `toman` is the contract's integer Toman. */
  transform(toman: number | null | undefined): string {
    return formatMoney(toman);
  }
}

@Pipe({ name: 'jdate' })
export class JalaliDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, withTime = false): string {
    return withTime ? formatJalaliDateTime(value) : formatJalaliDate(value);
  }
}
