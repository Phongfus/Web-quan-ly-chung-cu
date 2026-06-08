import { Card, Button, Space, Typography, Modal, Form, Input, message } from 'antd';
import { LogoutOutlined, LockOutlined } from '@ant-design/icons';
import { useModel, history, request } from '@umijs/max';
import { useState } from 'react';

const { Title, Text } = Typography;

export default () => {
  const { setInitialState } = useModel('@@initialState');
  const [changePasswordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc muốn đăng xuất?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      onOk: () => {
        localStorage.removeItem('token');
        setInitialState((s: any) => ({ ...s, currentUser: undefined }));
        history.push('/user/login');
      },
    });
  };

  const handleChangePassword = async (values: any) => {
    setLoading(true);

    try {
      const data = await request('/auth/change-password', {
        method: 'POST',
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });

      if (data) {
        message.success('Đổi mật khẩu thành công');

        changePasswordForm.resetFields();

        setShowPasswordForm(false);
      }
    } catch (error: any) {
      message.error(error?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Cài đặt</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <LockOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                Đổi mật khẩu
              </Title>
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Thay đổi mật khẩu tài khoản của bạn
            </Text>
          </div>

          {!showPasswordForm ? (
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={() => setShowPasswordForm(true)}
              size="large"
            >
              Đổi mật khẩu
            </Button>
          ) : (
            <Form
              form={changePasswordForm}
              layout="vertical"
              onFinish={handleChangePassword}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Đổi mật khẩu
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordForm(false);
                      changePasswordForm.resetFields();
                    }}
                  >
                    Hủy
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </Space>
      </Card>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <LogoutOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
              <Title level={4} style={{ margin: 0 }}>
                Đăng xuất
              </Title>
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Đăng xuất khỏi hệ thống
            </Text>
          </div>

          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size="large"
          >
            Đăng xuất
          </Button>
        </Space>
      </Card>
    </div>
  );
};
