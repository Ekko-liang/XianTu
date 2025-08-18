/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Global declarations for Tavern-Helper and lodash
declare const triggerSlash: (command: string) => Promise<void>;
declare const _: any; // lodash