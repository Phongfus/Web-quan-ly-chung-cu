import { Badge } from 'antd';
import { useState, useEffect } from 'react';
import { history, useModel } from '@umijs/max';
import { AppstoreOutlined, MessageOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { getUnreadCount as getMessageUnreadCount } from '@/services/message';
import { getUnreadCount as getNotificationUnreadCount } from '@/services/notification';
import { on, initSocketClient } from '@/services/socket';

const Actions = () => {
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const { setInitialState } = useModel('@@initialState');

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const msgRes = await getMessageUnreadCount();
        setMessageCount(msgRes.count);

        const notifRes = await getNotificationUnreadCount();
        setNotificationCount(notifRes.unreadNotifications);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const socket = initSocketClient();
    if (!socket.connected) {
      socket.connect();
    }

    // Listen for new notifications
    const unsubscribeNewNotif = on('notification:new', (data: { unreadCount?: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setNotificationCount(data.unreadCount);
        setInitialState?.((prev: any) => ({
          ...prev,
          unreadNotifications: data.unreadCount,
        }));
      } else {
        setNotificationCount((prev) => prev + 1);
        setInitialState?.((prev: any) => ({
          ...prev,
          unreadNotifications: (prev.unreadNotifications || 0) + 1,
        }));
      }
    });

    // Listen for notification marked as read
    const unsubscribeReadNotif = on('notification:read', (data: { unreadCount?: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setNotificationCount(data.unreadCount);
        setInitialState?.((prev: any) => ({
          ...prev,
          unreadNotifications: data.unreadCount,
        }));
      } else {
        setNotificationCount((prev) => Math.max(0, prev - 1));
        setInitialState?.((prev: any) => ({
          ...prev,
          unreadNotifications: Math.max(0, (prev.unreadNotifications || 0) - 1),
        }));
      }
    });

    // Listen for all notifications marked as read
    const unsubscribeAllReadNotif = on('notification:allread', () => {
      setNotificationCount(0);
      setInitialState?.((prev: any) => ({
        ...prev,
        unreadNotifications: 0,
      }));
    });

    const unsubscribeCountUpdatedNotif = on('notification:count-updated', (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setNotificationCount(data.unreadCount);
        setInitialState?.((prev: any) => ({
          ...prev,
          unreadNotifications: data.unreadCount,
        }));
      }
    });

    // Listen for new messages
    const unsubscribeNewMessage = on('message:new', () => {
      setMessageCount((prev) => prev + 1);
    });

    // Listen for conversation updates, because recipient receives conversation:updated when a new message arrives
    const unsubscribeConversationUpdated = on('conversation:updated', async () => {
      try {
        const res = await getMessageUnreadCount();
        setMessageCount(res.count);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    });

    // Listen for message unread count updates
    const unsubscribeMsgCountUpdate = on('message:unread-count-updated', (data: { count: number }) => {
      if (typeof data?.count === 'number') {
        setMessageCount(data.count);
      } else {
        getMessageUnreadCount().then((res) => setMessageCount(res.count)).catch((error) => {
          console.error('Error fetching message count:', error);
        });
      }
    });

    return () => {
      unsubscribeNewNotif();
      unsubscribeReadNotif();
      unsubscribeAllReadNotif();
      unsubscribeCountUpdatedNotif();
      unsubscribeNewMessage();
      unsubscribeConversationUpdated();
      unsubscribeMsgCountUpdate();
    };
  }, [setInitialState]);

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
        count={notificationCount}
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