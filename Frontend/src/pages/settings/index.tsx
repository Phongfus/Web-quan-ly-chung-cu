import { Card, Button, Radio, Space, Typography, Divider, Modal } from 'antd';
import { GlobalOutlined, LogoutOutlined } from '@ant-design/icons';
import { useIntl, setLocale, getLocale, useModel, history } from '@umijs/max';
import { useState } from 'react';

const { Title, Text } = Typography;

export default () => {
  const intl = useIntl();
  const { setInitialState } = useModel('@@initialState');
  const currentLocale = getLocale();
  const [selectedLang, setSelectedLang] = useState(currentLocale);

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
