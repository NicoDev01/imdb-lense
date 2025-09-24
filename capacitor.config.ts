import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.a487f96a2e854af8b91e34acc07377a4',
  appName: 'Film Scanner',
  webDir: 'dist',
  server: {
    url: 'https://a487f96a-2e85-4af8-b91e-34acc07377a4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      quality: 90,
      resultType: 'base64',
      source: 'camera',
      direction: 'rear',
      saveToGallery: false,
      correctOrientation: true
    }
  }
};

export default config;