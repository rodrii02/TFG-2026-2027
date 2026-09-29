import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'es.tfg.clarifica',
  appName: 'MicroFoodScan',
  webDir: 'dist/clarifica/browser',
  // No remote server: the native application always bundles its own assets.
  ios: { contentInset: 'never' },
};
export default config;
