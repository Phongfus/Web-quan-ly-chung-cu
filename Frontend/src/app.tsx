import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { getIntl, history } from '@umijs/max';
import { AppstoreOutlined, MessageOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { Badge } from 'antd';

type InitialState = {
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatar?: string;
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


export const layout: RunTimeLayoutConfig = ({ initialState }) => {

  const actionIconStyle = {
    width: 30,
    height: 30,
    borderRadius: ' 50%',
    background: '#ececec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  };

  return {

    title: getIntl().formatMessage({ id: 'app.title' }),

    layout: 'mix',

    actionsRender: () => [
      <Badge key="appstore" color="#1890ff" size="small" style={{ zIndex: 1 }}>
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/')}
        >
          <AppstoreOutlined style={{ fontSize: 18, color: '#1890ff' }} />
        </div>
      </Badge>,
      <Badge
        key="message"
        count={5}
        size="small"
        offset={[-4, 8]}
        overflowCount={99}
        style={{ backgroundColor: '#ff0004', color: '#fff', zIndex: 1 }}
      >
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/messages')}
        >
          <MessageOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
        </div>
      </Badge>,
      <Badge
        key="bell"
        count={12}
        size="small"
        offset={[-4, 8]}
        overflowCount={99}
        style={{ backgroundColor: '#ff0004', color: '#fff', zIndex: 1 }}
      >
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/notifications')}
        >
          <BellOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />
        </div>
      </Badge>,
      <Badge key="settings" color="#8c8c8c" size="small" style={{ zIndex: 1 }}>
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/settings')}
        >
          <SettingOutlined style={{ fontSize: 18, color: '#000000' }} />
        </div>
      </Badge>,
    ],

    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.fullName,
    },

    footerRender: () => null,

  };

};