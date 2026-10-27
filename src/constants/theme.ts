import type { ThemeConfig } from 'antd';

export const APP_THEME: ThemeConfig = {
  token: {
    borderRadius: 6,
    colorBgLayout: '#f5f6f7',
    colorPrimary: '#9a6700',
    colorText: '#1f2328',
    colorTextSecondary: '#59636e',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Button: {
      controlHeight: 34,
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 6,
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    },
    Tabs: {
      horizontalItemGutter: 24,
      inkBarColor: '#9a6700',
    },
  },
};
