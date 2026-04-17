export default [
  {
    path: '/user/login',
    layout: false,
    component: './user/login',
  },

  {
    path: '/',
    name: 'dashboard',
    icon: 'DashboardOutlined',
    component: './dashboard',
  },
  {
    path: '/apartments',
    name: 'apartments',
    icon: 'HomeOutlined',
    component: './apartment',
  },
  {
    path: '/residents',
    name: 'residents',
    icon: 'TeamOutlined',
    component: './resident',
  },
  {
    path: '/bills',
    name: 'bills',
    icon: 'FileTextOutlined',
    component: './bill',
  },
  {
    path: '/services',
    name: 'services',
    icon: 'ToolOutlined',
    component: './service',
  },
  {
    path: '/vehicles',
    name: 'vehicles',
    icon: 'CarOutlined',
    component: './vehicle',
  },
  {
    path: '/messages',
    name: 'messages',
    icon: 'MessageOutlined',
    component: './message',
  },
  {
    path: '/settings',
    name: 'settings',
    icon: 'SettingOutlined',
    component: './settings',
  },
];