export default [
  {
    path: '/user/login',
    layout: false,
    component: './user/login',
  },

  {
    path: '/',
    name: 'menu.dashboard',
    icon: 'DashboardOutlined',
    component: './dashboard',
  },
  {
    path: '/apartments',
    name: 'menu.apartments',
    icon: 'HomeOutlined',
    component: './apartment',
  },
  {
    path: '/residents',
    name: 'menu.residents',
    icon: 'TeamOutlined',
    component: './resident',
  },
  {
    path: '/bills',
    name: 'menu.bills',
    icon: 'FileTextOutlined',
    component: './bill',
  },
  {
    path: '/services',
    name: 'menu.services',
    icon: 'ToolOutlined',
    component: './service',
  },
  {
    path: '/settings',
    name: 'menu.settings',
    icon: 'SettingOutlined',
    component: './settings',
  },
];