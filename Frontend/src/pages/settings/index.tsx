// File này chứa trang Cài đặt cho người dùng: đổi mật khẩu và đăng xuất.
// Mục tiêu: chỉ thêm comment tiếng Việt cho từng hàm/khối để dễ học.
import { Card, Button, Space, Typography, Modal, Form, Input, message } from 'antd';
import { LogoutOutlined, LockOutlined } from '@ant-design/icons';
import { useModel, history, request } from '@umijs/max';
import { useState } from 'react';

const { Title, Text } = Typography;

// Component chính của trang Settings
export default () => {
  const { setInitialState } = useModel('@@initialState');
  const [changePasswordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Xử lý đăng xuất
  // Hiển thị hộp thoại xác nhận, nếu xác nhận thì xóa token, cập nhật initialState và điều hướng về trang login
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

  // Xử lý thay đổi mật khẩu
  // Gọi API POST /auth/change-password với currentPassword và newPassword.
  // Hiển thị thông báo thành công hoặc lỗi, và ẩn form khi đổi thành công.
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
      {/* Tiêu đề trang */}
      <Title level={2}>Cài đặt</Title>

        {/* Phần: Đổi mật khẩu
          - Hiển thị mô tả ngắn
          - Nếu chưa mở form thì hiện nút 'Đổi mật khẩu'
          - Nếu đã mở form thì hiện Form với các trường và validate
        */}
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

          {/* Hiển thị nút hoặc form đổi mật khẩu tùy trạng thái */}
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
            // Form đổi mật khẩu
            // validate: yêu cầu mật khẩu mới >= 6 ký tự
            // xác nhận mật khẩu phải trùng với newPassword
            // onFinish gọi handleChangePassword
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

              {/* Nút gửi và hủy form */}
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Đổi mật khẩu
                  </Button>
                  <Button
                    onClick={() => {
                      // Khi hủy: ẩn form và reset các trường
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

        {/* Phần: Đăng xuất
          - Hiển thị mô tả và nút Đăng xuất (danger)
          - Khi click, gọi handleLogout để xác nhận
        */}
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

          {/* Nút Đăng xuất chính */}
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
