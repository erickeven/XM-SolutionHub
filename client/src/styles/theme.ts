import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1D4ED8',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorInfo: '#1D4ED8',
    colorTextBase: '#111827',
    colorBgBase: '#FFFFFF',
    colorBorder: '#D8DEE8',
    colorBgLayout: '#F6F8FB',
    borderRadius: 6,
    fontSize: 14,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#0B1F36',
      triggerBg: 'transparent',
      triggerColor: '#94a3b8',
      headerBg: '#FFFFFF',
      bodyBg: '#F6F8FB',
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemColor: '#94a3b8',
      darkItemSelectedBg: 'rgba(214,160,76,0.18)',
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemHoverColor: '#FFFFFF',
      itemBorderRadius: 6,
      itemMarginInline: 8,
      iconSize: 16,
      fontSize: 14,
    },
    Table: {
      headerBg: '#F6F8FB',
      headerColor: '#374151',
      headerSortActiveBg: '#F1F5F9',
      headerSortHoverBg: '#F1F5F9',
      borderColor: '#D8DEE8',
      rowHoverBg: '#F8FAFC',
      fontSize: 13,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Card: {
      borderRadiusLG: 8,
      colorBorderSecondary: '#D8DEE8',
      paddingLG: 20,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 38,
      controlHeightSM: 32,
      fontWeight: 500,
      primaryShadow: 'none',
    },
    Modal: {
      borderRadiusLG: 10,
      titleFontSize: 16,
    },
    Drawer: {
      borderRadiusLG: 10,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 38,
      controlHeightSM: 32,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 38,
      controlHeightSM: 32,
    },
    InputNumber: {
      borderRadius: 6,
      controlHeight: 38,
      controlHeightSM: 32,
    },
    DatePicker: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Form: {
      labelColor: '#374151',
      marginLG: 16,
      labelFontSize: 14,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Badge: {
      textFontSize: 12,
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    },
    Descriptions: {
      itemPaddingBottom: 8,
      labelBg: '#F8FAFC',
      contentColor: '#111827',
    },
    Breadcrumb: {
      fontSize: 13,
      separatorColor: '#94a3b8',
    },
    Tabs: {
      itemSelectedColor: '#2563EB',
      inkBarColor: '#2563EB',
    },
    Alert: {
      borderRadiusLG: 8,
    },
  },
};
