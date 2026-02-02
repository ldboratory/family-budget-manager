import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.myfamily.budget",
  appName: "가족 가계부",
  webDir: "out",
  server: {
    // 개발 시 로컬 서버 사용 (주석 해제하여 사용)
    // url: "http://localhost:3000",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
  ios: {
    // iOS 특정 설정
    contentInset: "automatic",
    scheme: "FamilyBudget",
  },
};

export default config;
