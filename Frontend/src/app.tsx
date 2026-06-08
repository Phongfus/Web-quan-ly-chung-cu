
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import Actions from '@/components/Actions';
import { initSocketClient, reconnectSocketWithToken } from '@/services/socket';

type InitialState = {
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatar?: string;
  };
  settings?: Record<string, any>;
  unreadNotifications?: number;
};

export async function getInitialState(): Promise<InitialState> {

  const token = localStorage.getItem('token');

  if (!token) {

    if (window.location.pathname !== '/user/login') {
      window.location.href = '/user/login';
    }

    return {};

  }

  try {

    const res = await fetch(

      `${process.env.UMI_APP_API_URL}/auth/me`

      ,

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }

    );

    if (!res.ok) throw new Error('Invalid token');

    const user = await res.json();

    // Fetch unread notifications count
    const unreadRes = await fetch(
      `${process.env.UMI_APP_API_URL}/notifications/unread-count`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let unreadNotifications = 0;
    if (unreadRes.ok) {
      const unreadData = await unreadRes.json();
      unreadNotifications = unreadData.count ?? 0;
    }

    return { currentUser: user, unreadNotifications };

  } catch (error) {

    localStorage.removeItem('token');

    window.location.href = '/user/login';

    return {};

  }

}

export const request: RequestConfig = {

  baseURL:
    process.env.UMI_APP_API_URL ||
    "http://localhost:3001/api",

  requestInterceptors: [

    (config:any)=>{

      const token = localStorage.getItem("token");

      if(token){

        config.headers = {
          ...(config.headers||{}),
          Authorization:`Bearer ${token}`
        };

      }

      return config;

    }

  ]

};


export const layout: RunTimeLayoutConfig = ({ initialState }) => {

  // Initialize socket when user is authenticated
  if (initialState?.currentUser) {
    reconnectSocketWithToken();
  } else {
    // Initialize socket even when not authenticated, it will reconnect when token is available
    initSocketClient();
  }

  return {
    logo: '/logo.png',
    title: 'Hệ thống quản lý chung cư',

    layout: 'mix',

    actionsRender: () => [<Actions key="actions" />],

    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.fullName,
    },

    footerRender: () => null,
  };

};

export function rootContainer(container: ReactNode) {
  return <ConfigProvider locale={viVN}>{container}</ConfigProvider>;
}
