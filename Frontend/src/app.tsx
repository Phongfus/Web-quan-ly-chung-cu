import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { RightContent } from '@/components/RightContent';
import { getIntl } from '@umijs/max';

type InitialState = {
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  settings?: Record<string, any>;
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

    return { currentUser: user };

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


// layout config

export const layout: RunTimeLayoutConfig = ({ initialState }) => {

  return {

    title: getIntl().formatMessage({ id: 'app.title' }),

    rightContentRender: () => {

      if (!initialState?.currentUser) {
        return null;
      }

      return <RightContent />;

    },

    footerRender: () => null,

  };

};