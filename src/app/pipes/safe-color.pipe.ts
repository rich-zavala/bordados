import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'safeColor', standalone: true })
export class SafeColorPipe implements PipeTransform {
  transform(symbol: string, legend: any, type: 'b' | 'c'): string {
    const entry = legend[symbol];
    if (!entry) {
      // Fallback colors if symbol is missing
      return type === 'b' ? '#f0f0f0' : '#000000';
    }
    return entry[type];
  }
}
