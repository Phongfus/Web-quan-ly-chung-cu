// Trang đăng nhập
// Mục đích: cung cấp form đăng nhập (email + password) và xử lý gửi dữ liệu lên API `login`.
// Lưu ý: chỉ thêm comment để học code, không thay đổi logic.
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet } from '@umijs/max';
import { message } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { Footer } from '@/components';
import { login } from '@/services/auth';

// Hook tạo style cho container của trang
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

// Component chính `Login`
// - Hiển thị giao diện đăng nhập (background, logo, tiêu đề, form)
// - Chứa hàm `handleSubmit` để gọi API và lưu token
const Login: React.FC = () => {
  const { styles } = useStyles();

  // Xử lý khi submit form
  // - Gọi `login` từ `@/services/auth` với email và password
  // - Lưu `token` vào localStorage nếu đăng nhập thành công
  // - Hiển thị message thành công hoặc lỗi
  const handleSubmit = async (values: any) => {
    try {
      const res = await login({
        email: values.email,
        password: values.password,
      });

      // Một số API trả token ở `res.token`, một số trả ở `res.data.token`
      const token = res.token || res.data?.token;

      if (!token) {
        throw new Error('No token');
      }

      // Lưu token và chuyển hướng về trang chủ
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

      {/* Center: vùng chứa chính căn giữa màn hình */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 0',
        }}
      >
        {/* Card: hộp trắng chứa logo + form */}
        <div
          style={{
            background: '#fff',
            padding: '40px 36px',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            width: 520,
          }}
        >
          {/* LoginForm: component của Pro Components cung cấp layout form chuẩn */}
          <LoginForm
            contentStyle={{
              width: '100%',
            }}
            // Logo hiển thị bên trái form
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
            // Title: tiêu đề lớn của trang đăng nhập
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
            // SubTitle: mô tả nhỏ bên dưới tiêu đề
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
            {/* Field EMAIL: bắt buộc nhập, validate required */}
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

            {/* Field PASSWORD: bắt buộc nhập, kiểu password */}
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