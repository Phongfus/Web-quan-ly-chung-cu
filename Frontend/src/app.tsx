import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { RightContent } from '@/components/RightContent';
import { getIntl } from '@umijs/max';

// Định nghĩa type cho InitialState
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
    const res = await fetch('http://localhost:3001/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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

  baseURL: "http://localhost:3001/api",

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

// Cấu hình layout runtime
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  console.log('Layout initialState:', initialState);
  return {
    title: getIntl().formatMessage({ id: 'app.title' }),
    rightContentRender: () => {
      console.log('rightContentRender - currentUser:', initialState?.currentUser);
      if (!initialState?.currentUser) {
        return null;
      }
      return <RightContent />;
    },
    footerRender: () => null,
  };
};
