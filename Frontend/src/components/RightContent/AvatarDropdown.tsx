import {
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;

    if (key === 'logout') {
      flushSync(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });

      handleLogout();
      return;
    }

    if (key === 'back') {
      setShowLangMenu(false);
      return;
    }

    // other menu keys handled below

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
      label: 'Cá nhân',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
    },
  ];

  const items = mainItems;

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