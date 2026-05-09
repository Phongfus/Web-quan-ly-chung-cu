import { Card, Button, Radio, Space, Typography, Divider, Modal, Form, Input, message } from 'antd';
import { GlobalOutlined, LogoutOutlined, LockOutlined } from '@ant-design/icons';
import { useIntl, setLocale, getLocale, useModel, history } from '@umijs/max';
import { useState } from 'react';
import { request } from '@umijs/max';

const { Title, Text } = Typography;

export default () => {
  const intl = useIntl();
  const { setInitialState } = useModel('@@initialState');
  const currentLocale = getLocale();
  const [selectedLang, setSelectedLang] = useState(currentLocale);
  const [changePasswordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setLocale(lang, false);
  };

  const handleLogout = () => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.settings.logout.confirm' }) || 'Xác nhận đăng xuất',
      content: intl.formatMessage({ id: 'pages.settings.logout.message' }) || 'Bạn có chắc muốn đăng xuất?',
      okText: intl.formatMessage({ id: 'pages.settings.logout.ok' }) || 'Đăng xuất',
      cancelText: intl.formatMessage({ id: 'pages.settings.logout.cancel' }) || 'Hủy',
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
      message.success(
        intl.formatMessage({
          id: 'pages.settings.password.success',
        }) || 'Đổi mật khẩu thành công',
      );

      changePasswordForm.resetFields();

      setShowPasswordForm(false);
    }
  } catch (error: any) {
    message.error(
      error?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu',
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div>
      <Title level={2}>
        {intl.formatMessage({ id: 'pages.settings.title' }) || 'Cài đặt'}
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <GlobalOutlined style={{ fontSize: 20 }} />
              <Title level={4} style={{ margin: 0 }}>
                {intl.formatMessage({ id: 'pages.settings.language' }) || 'Ngôn ngữ'}
              </Title>
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {intl.formatMessage({ id: 'pages.settings.language.desc' }) || 'Chọn ngôn ngữ hiển thị cho hệ thống'}
            </Text>
          </div>

          <Radio.Group
            value={selectedLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="vi-VN">🇻🇳 Tiếng Việt</Radio.Button>
            <Radio.Button value="en-US">🇺🇸 English</Radio.Button>
          </Radio.Group>
        </Space>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <LockOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                {intl.formatMessage({ id: 'pages.settings.password' }) || 'Đổi mật khẩu'}
              </Title>
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {intl.formatMessage({ id: 'pages.settings.password.desc' }) || 'Thay đổi mật khẩu tài khoản của bạn'}
            </Text>
          </div>

          {!showPasswordForm ? (
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={() => setShowPasswordForm(true)}
              size="large"
            >
              {intl.formatMessage({ id: 'pages.settings.password.button' }) || 'Đổi mật khẩu'}
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
                label={intl.formatMessage({ id: 'pages.settings.password.current' }) || 'Mật khẩu hiện tại'}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={intl.formatMessage({ id: 'pages.settings.password.new' }) || 'Mật khẩu mới'}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={intl.formatMessage({ id: 'pages.settings.password.confirm' }) || 'Xác nhận mật khẩu mới'}
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
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                  >
                    {intl.formatMessage({ id: 'pages.settings.password.button' }) || 'Đổi mật khẩu'}
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
                {intl.formatMessage({ id: 'pages.settings.logout' }) || 'Đăng xuất'}
              </Title>
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {intl.formatMessage({ id: 'pages.settings.logout.desc' }) || 'Đăng xuất khỏi hệ thống'}
            </Text>
          </div>

          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size="large"
          >
            {intl.formatMessage({ id: 'pages.settings.logout.button' }) || 'Đăng xuất'}
          </Button>
        </Space>
      </Card>
    </div>
  );
};
