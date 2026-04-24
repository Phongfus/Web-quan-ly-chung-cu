import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { getIntl } from '@umijs/max';
import Actions from '@/components/Actions';

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
      unreadNotifications = unreadData.unreadNotifications || 0;
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

  return {

    title: getIntl().formatMessage({ id: 'app.title' }),

    layout: 'mix',

    actionsRender: () => [<Actions unreadNotifications={initialState?.unreadNotifications} key="actions" />],

    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.fullName,
    },

    footerRender: () => null,

  };

};