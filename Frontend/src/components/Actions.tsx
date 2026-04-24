import { Badge } from 'antd';
import { useState, useEffect } from 'react';
import { history } from '@umijs/max';
import { AppstoreOutlined, MessageOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { getUnreadCount as getMessageUnreadCount } from '@/services/message';

const Actions = ({ unreadNotifications }: { unreadNotifications?: number }) => {
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const fetchMessageCount = async () => {
      try {
        const msgRes = await getMessageUnreadCount();
        setMessageCount(msgRes.count);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    };
    fetchMessageCount();
  }, []);

  const actionIconStyle = {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#ececec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  };

  return (
    <>
      <Badge key="appstore" color="#1890ff" size="small" style={{ zIndex: 1 }}>
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/')}
        >
          <AppstoreOutlined style={{ fontSize: 18, color: '#1890ff' }} />
        </div>
      </Badge>
      <Badge
        key="message"
        count={messageCount}
        size="small"
        offset={[-4, 8]}
        overflowCount={99}
        style={{ backgroundColor: '#ff0004', color: '#fff', zIndex: 1 }}
      >
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/messages')}
        >
          <MessageOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
        </div>
      </Badge>
      <Badge
        key="bell"
        count={unreadNotifications || 0}
        size="small"
        offset={[-4, 8]}
        overflowCount={99}
        style={{ backgroundColor: '#ff0004', color: '#fff', zIndex: 1 }}
      >
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/notifications')}
        >
          <BellOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />
        </div>
      </Badge>
      <Badge key="settings" color="#8c8c8c" size="small" style={{ zIndex: 1 }}>
        <div
          style={{
            ...actionIconStyle,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e4e6eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f2f5';
          }}
          onClick={() => history.push('/settings')}
        >
          <SettingOutlined style={{ fontSize: 18, color: '#000000' }} />
        </div>
      </Badge>
    </>
  );
};

export default Actions;