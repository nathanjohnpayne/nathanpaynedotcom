/**
 * The browser-side surface the privacy specs read inside `page.evaluate`.
 * `npPrivacy` is the contract's runtime API (specs/analytics-privacy.md § Runtime API).
 */
export {};

declare global {
  interface Window {
    npPrivacy?: {
      version: number;
      get(): {
        saved: 'unset' | 'granted' | 'denied';
        effective: 'granted' | 'denied';
        reason: 'default' | 'choice' | 'gpc';
        persisted: boolean;
        loadedThisPage: boolean;
      };
      set(choice: 'granted' | 'denied'): boolean;
      gpc(): boolean;
      onChange(fn: (state: unknown) => void): () => void;
      notice: { shouldShow(): boolean; dismiss(): void };
    };
  }
}
