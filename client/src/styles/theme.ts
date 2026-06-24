import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563EB',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorInfo: '#2563EB',
    colorTextBase: '#111827',
    colorBgBase: '#FFFFFF',
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
      bodyBg: '#F8FAFC',
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemColor: '#94a3b8',
      darkItemSelectedBg: 'rgba(255,255,255,0.08)',
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemHoverColor: '#FFFFFF',
      itemBorderRadius: 6,
      itemMarginInline: 8,
      iconSize: 16,
      fontSize: 14,
    },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#374151',
      headerSortActiveBg: '#F1F5F9',
      headerSortHoverBg: '#F1F5F9',
      borderColor: '#E5E7EB',
      rowHoverBg: '#F8FAFC',
      fontSize: 13,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Card: {
      borderRadiusLG: 8,
      colorBorderSecondary: '#E5E7EB',
      paddingLG: 20,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightSM: 32,
      fontWeight: 500,
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
      controlHeight: 36,
      controlHeightSM: 32,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightSM: 32,
    },
    InputNumber: {
      borderRadius: 6,
      controlHeight: 36,
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
