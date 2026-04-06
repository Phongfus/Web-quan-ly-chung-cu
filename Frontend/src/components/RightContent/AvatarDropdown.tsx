import {
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { history, useModel, useIntl, setLocale, getLocale } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin } from 'antd';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import HeaderDropdown from '../HeaderDropdown';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/user/login';
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};

  return <span>{currentUser?.fullName || 'Admin'}</span>;
};

export const AvatarDropdown: React.FC<any> = ({ children }) => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const intl = useIntl();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentLocale = getLocale();

  const handleLanguageChange = (lang: string) => {
    setLocale(lang, false);
    setShowLangMenu(false);
    setDropdownOpen(false);
  };

  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;

    if (key === 'logout') {
      flushSync(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });

      handleLogout();
      return;
    }

    if (key === 'language') {
      setShowLangMenu(true);
      return;
    }

    if (key === 'back') {
      setShowLangMenu(false);
      return;
    }

    if (key === 'vi-VN' || key === 'en-US') {
      handleLanguageChange(key);
      return;
    }

    history.push(`/account/${key}`);
  };

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (!open) {
      setShowLangMenu(false);
    }
  };

  if (!initialState) {
    return <Spin size="small" />;
  }

  const { currentUser } = initialState;

  if (!currentUser) {
    return <Spin size="small" />;
  }

  const mainItems = [
    {
      key: 'center',
      icon: <UserOutlined />,
      label: intl.formatMessage({ id: 'component.globalHeader.avatar.personal' }),
    },
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: intl.formatMessage({ id: 'component.globalHeader.avatar.language' }) || 'Ngôn ngữ',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: intl.formatMessage({ id: 'component.globalHeader.avatar.logout' }),
    },
  ];

  const langItems = [
    {
      key: 'back',
      icon: <SettingOutlined />,
      label: '← ' + (intl.formatMessage({ id: 'component.globalHeader.avatar.back' }) || 'Quay lại'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'vi-VN',
      label: '🇻🇳 Tiếng Việt',
      disabled: currentLocale === 'vi-VN',
    },
    {
      key: 'en-US',
      label: '🇺🇸 English',
      disabled: currentLocale === 'en-US',
    },
  ];

  const items = showLangMenu ? langItems : mainItems;

  return (
    <HeaderDropdown
      open={dropdownOpen}
      onOpenChange={handleOpenChange}
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items,
      }}
    >
      {children}
    </HeaderDropdown>
  );
};