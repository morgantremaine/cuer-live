// Global type declarations

declare global {
  interface Window {
    __pendingSaves?: Set<string>;
  }
}

export {};
