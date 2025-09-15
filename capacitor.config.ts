import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8194d7efdbfa40fbac2a5f6a35bd131a',
  appName: 'cuer-live',
  webDir: 'dist',
  server: {
    url: 'https://8194d7ef-dbfa-40fb-ac2a-5f6a35bd131a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;