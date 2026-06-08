import { defineConfig } from '@umijs/max';
import routes from './routes';

export default defineConfig({
  routes,

  title: 'Apartment Management',

  layout: {
    title: 'Hệ thống quản lý chung cư',
    locale: false,
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

  request: {
    dataField: '',
  },

  proxy: {
    '/api': {
      target: process.env.UMI_APP_API_URL || 'http://localhost:3001',
      changeOrigin: true,
    },
  },

  model: {},
  initialState: {},
  access: {},

  moment2dayjs: {
    preset: 'antd',
  },

  locale: false,

  fastRefresh: true,

  esbuildMinifyIIFE: true,
  jsMinifier: 'esbuild',
  mfsu: false,

});