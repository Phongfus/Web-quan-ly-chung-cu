export default [
  {
    path: '/user/login',
    layout: false,
    component: './user/login',
  },

  {
    path: '/',
    name: 'Trang chủ',
    icon: 'DashboardOutlined',
    component: './dashboard',
  },
  {
    path: '/apartments',
    name: 'Căn hộ',
    icon: 'HomeOutlined',
    component: './apartment',
  },
  {
    path: '/residents',
    name: 'Cư dân',
    icon: 'TeamOutlined',
    component: './resident',
  },
  {
    path: '/bills',
    name: 'Hóa đơn',
    icon: 'FileTextOutlined',
    component: './bill',
  },
  {
    path: '/services',
    name: 'Dịch vụ',
    icon: 'ToolOutlined',
    component: './service',
  },
  {
    path: '/vehicles',
    name: 'Phương tiện',
    icon: 'CarOutlined',
    component: './vehicle',
  },
  {
    path: '/messages',
    name: 'Nhắn tin',
    icon: 'MessageOutlined',
    component: './message',
  },
  {
    path: '/notifications',
    name: 'Thông báo',
    icon: 'BellOutlined',
    component: './notification',
  },
  {
    path: '/complaints',
    name: 'Khiếu nại',
    icon: 'ExclamationCircleOutlined',
    component: './complaint',
  },
  {
    path: '/settings',
    name: 'Cài đặt',
    icon: 'SettingOutlined',
    component: './settings',
  },
];