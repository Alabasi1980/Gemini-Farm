import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyvalue',
  standalone: true,
})
export class KeyValuePipe implements PipeTransform {
  transform(value: { [key: string]: any } | undefined | null): { key: string; value: any }[] {
    if (!value) {
      return [];
    }
    return Object.entries(value).map(([key, value]) => ({ key, value }));
  }
}
