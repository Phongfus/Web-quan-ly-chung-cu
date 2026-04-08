import { defineConfig } from '@umijs/max';
import routes from './routes';

export default defineConfig({
  routes,

  title: 'Apartment Management',

  layout: {
    title: 'Building Manager',
    locale: true,
    layout: 'side',
    siderWidth: 208,
    navTheme: 'light',
    colorPrimary: '#1890ff',
    fixedHeader: true,
    fixSiderbar: true,
    contentWidth: 'Fluid',
    splitMenus: false,
  },

  antd: {},
  
  request: {},
  model: {},
  initialState: {},
  access: {},

  moment2dayjs: {
    preset: 'antd',
  },

  locale: {
    default: 'vi-VN',
    antd: true,
    baseNavigator: true,
  },

  fastRefresh: true,

  esbuildMinifyIIFE: true,  
});