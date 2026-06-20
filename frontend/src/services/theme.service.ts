import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'pocket-ledger-theme';
  readonly theme = signal<AppTheme>(
    document.documentElement.classList.contains('app-dark') ? 'dark' : 'light'
  );

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    document.documentElement.classList.toggle('app-dark', theme === 'dark');
    localStorage.setItem(this.storageKey, theme);
  }
}
