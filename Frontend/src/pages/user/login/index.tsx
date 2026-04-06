import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, SelectLang } from '@umijs/max';
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
        <title>Login</title>
      </Helmet>

      <div style={{ position: 'fixed', right: 16, top: 16 }}>
        <SelectLang />
      </div>

      <div style={{ flex: 1, padding: '32px 0' }}>
        <LoginForm
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="Apartment System"
          subTitle="Hệ thống quản lý chung cư"
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
            placeholder="Password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
            ]}
          />
        </LoginForm>
      </div>

      <Footer />
    </div>
  );
};

export default Login;