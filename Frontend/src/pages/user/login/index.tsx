import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet } from '@umijs/max';
import { message } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { Footer } from '@/components';
import { login } from '@/services/auth';

const useStyles = createStyles(() => {
  return {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

const Login: React.FC = () => {
  const { styles } = useStyles();

  const handleSubmit = async (values: any) => {
    try {
      const res = await login({
        email: values.email,
        password: values.password,
      });

      const token = res.token || res.data?.token;

      if (!token) {
        throw new Error('No token');
      }

      localStorage.setItem('token', token);

      message.success('Đăng nhập thành công');

      window.location.href = '/';
    } catch (error) {
      console.log(error);
      message.error('Sai tài khoản hoặc mật khẩu');
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Đăng nhập</title>
      </Helmet>

      {/* Center */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 0',
        }}
      >
        {/* Card */}
        <div
          style={{
            background: '#fff',
            padding: '40px 36px',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            width: 520,
          }}
        >
          <LoginForm
            contentStyle={{
              width: '100%',
            }}
            logo={ <img alt="logo"src="/logo.png"
                style={{
                  width: 110,
                  height: 110,
                  objectFit: 'contain',
                  marginBottom: 8,
                  marginLeft: -120,
                }}
              />
            }
            title={
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  paddingLeft: 30,
                  lineHeight: 1.2,
                  width: '100%',
                  marginLeft: -80,
                }}
              >
                Đăng nhập
              </div>
            }
            subTitle={
              <div
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  color: '#64748b',
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                Hệ thống quản lý chung cư
              </div>
            }
            onFinish={handleSubmit}
          >
            {/* EMAIL */}
            <ProFormText
              name="email"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
              }}
              placeholder="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
              ]}
            />

            {/* PASSWORD */}
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
              ]}
            />
          </LoginForm>
        </div>
      </div>

    </div>
  );
};

export default Login;