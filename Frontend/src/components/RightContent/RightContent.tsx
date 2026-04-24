import React, { useEffect, useState } from 'react';
import { Space, Badge, Tooltip } from 'antd';
import { MessageOutlined, BellOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useModel, history } from '@umijs/max';
import { SelectLang } from '@umijs/max';
import { AvatarDropdown, AvatarName } from './AvatarDropdown';
import { getUnreadCount } from '@/services/notification';

const RightContent: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!initialState?.currentUser) return;

    const fetchUnread = async () => {
        try {
            const res = await getUnreadCount();

            console.log('UNREAD API =', res);

            // ✅ đúng với type { count: number }
            setUnreadCount(Number(res.count || 0));

        } catch (error) {
            console.error(error);
            setUnreadCount(0);
        }
        };
    fetchUnread();

    const timer = setInterval(fetchUnread, 5000);
    return () => clearInterval(timer);

  }, [initialState?.currentUser]);

  if (!initialState) return <div />;

  return (
    <Space size="middle" style={{ alignItems: 'center' }}>
      <SelectLang />

      <Tooltip title="Messenger">
        <Badge count={unreadCount} showZero size="small" overflowCount={99}>
          <MessageOutlined
            style={{ fontSize: 20, cursor: 'pointer' }}
            onClick={() => history.push('/messages')}
          />
        </Badge>
      </Tooltip>

      <Tooltip title="Thông báo">
        <Badge dot={unreadCount > 0} color="red">
          <BellOutlined
            style={{ fontSize: 20, cursor: 'pointer' }}
            onClick={() => history.push('/notifications')}
          />
        </Badge>
      </Tooltip>

      <Tooltip title="Cài đặt">
        <SettingOutlined
          style={{ fontSize: 20, cursor: 'pointer' }}
          onClick={() => history.push('/account/settings')}
        />
      </Tooltip>

      <AvatarDropdown>
        <Space style={{ cursor: 'pointer' }}>
          <UserOutlined style={{ fontSize: 18 }} />
          <AvatarName />
        </Space>
      </AvatarDropdown>
    </Space>
  );
};

export default RightContent;