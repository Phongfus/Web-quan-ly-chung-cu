import { useState, useEffect, useRef } from 'react';
import { List, Avatar, Button, Modal, Input, message, Space, Dropdown } from 'antd';
import { MessageOutlined, SendOutlined, EllipsisOutlined, PhoneOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { useModel } from '@umijs/max';
import { getConversations, getMessages, sendMessage, createConversation, ConversationItem, MessageItem, updateMessage, deleteMessage, deleteConversation } from '@/services/message';
import { getUsers, UserItem } from '@/services/user';

const { TextArea } = Input;

type LocalConversationItem = ConversationItem & { hasUnread: boolean };

export default () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [conversations, setConversations] = useState<LocalConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<LocalConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getLatestConversationMessage = (messages?: ConversationItem['messages']) => {
    if (!messages || messages.length === 0) return undefined;
    return messages.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    }, messages[0]);
  };

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      const localData: LocalConversationItem[] = data.map(conv => {
        const latestMessage = getLatestConversationMessage(conv.messages);
        const isFromOther = latestMessage?.senderId !== currentUser?.id;

        return {
          ...conv,
          hasUnread: !!latestMessage && isFromOther && latestMessage?.isRead === false,
        };
      });
      setConversations(localData);
    } catch (error) {
      message.error( intl.formatMessage({ id: 'pages.message.loadConversationError' }));
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      // Nếu là cư dân, cho phép chat với admin/staff; nếu không thì chat với cư dân
      const filteredUsers = currentUser?.role === 'RESIDENT' 
        ? data.filter(user => user.role !== 'RESIDENT' && user.id !== currentUser?.id)
        : data.filter(user => user.role === 'RESIDENT');
      setUsers(filteredUsers);
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.message.loadUsersError' }));
    }
  };

  useEffect(() => {
    loadConversations();
    loadUsers();
    // Reload conversations every 30 seconds to update unread status
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleConversationClick = async (conversation: LocalConversationItem) => {
    setSelectedConversation(conversation);
    setIsModalOpen(true);
    try {
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
      await loadConversations();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      message.error( intl.formatMessage({ id: 'pages.message.loadMessagesError' }));
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      const msg = await sendMessage(selectedConversation.id, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      await loadConversations();
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.message.sendError' }));
    }
  };

  const handleCreateConversation = async (userId: string) => {
    try {
      const conv = await createConversation(userId);
      setConversations(prev => [{ ...conv, hasUnread: false }, ...prev]);
      setIsCreateModalOpen(false);
      message.success( intl.formatMessage({ id: 'pages.message.createSuccess' }));
    } catch (error) {
      message.error( intl.formatMessage({ id: 'pages.message.createError' }));
    }
  };

  const handleEditMessage = (msg: MessageItem) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleSaveEditMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      const updatedMsg = await updateMessage(editingMessageId, editingContent.trim());
      setMessages(prev => prev.map(m => m.id === editingMessageId ? updatedMsg : m));
      setEditingMessageId(null);
      setEditingContent('');
      message.success( intl.formatMessage({ id: 'pages.message.updateSuccess' }));
    } catch (error) {
      message.error( intl.formatMessage({ id: 'pages.message.updateError' }));
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.message.confirmDeleteTitle' }),
      content: intl.formatMessage({ id: 'pages.message.confirmDeleteMessage' }),
      okText: intl.formatMessage({ id: 'pages.common.delete' }),
      cancelText: intl.formatMessage({ id: 'pages.common.cancel' }),
      onOk: async () => {
        try {
          await deleteMessage(messageId);
          setMessages(prev => prev.filter(m => m.id !== messageId));

          message.success(
            intl.formatMessage({ id: 'pages.message.deleteSuccess' })
          );
        } catch (error) {
          message.error(
            intl.formatMessage({ id: 'pages.message.deleteError' })
          );
        }
      },
    });
  };

  const handleCall = () => {
    if (!selectedConversation) return;
    const otherUser = getOtherUser(selectedConversation);
    if (otherUser.phone) {
      navigator.clipboard.writeText(otherUser.phone);
      message.success( `${intl.formatMessage({ id: 'pages.message.phone' })}: ${otherUser.phone}`);
    } else {
      message.error( intl.formatMessage({ id: 'pages.message.phoneUnavailable' }));
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.message.confirmDeleteTitle' }),
      content: intl.formatMessage({ id: 'pages.message.confirmDeleteConversationMessage'}),
      okText: intl.formatMessage({ id: 'pages.common.delete' }),
      cancelText: intl.formatMessage({ id: 'pages.common.cancel' }),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteConversation(conversationId);
          setConversations(prev => prev.filter(c => c.id !== conversationId));
          if (selectedConversation?.id === conversationId) {
            setIsModalOpen(false);
          }
          message.success( intl.formatMessage({ id: 'pages.message.deleteConversationSuccess'}));
        } catch (error) {
          message.error( intl.formatMessage({ id: 'pages.message.deleteConversationError'})
          );
        }
      },
    });
  };

  const getOtherUser = (conversation: LocalConversationItem) => {
    if (!conversation?.user1 || !conversation?.user2 || !currentUser) {
      return {
        id: "",
        fullName: intl.formatMessage({ id: 'pages.common.user' }),
        phone: "",
        role: "RESIDENT"
      };
    }

    return conversation.user1.id === currentUser.id
      ? conversation.user2
      : conversation.user1;
  };

  const usersWithoutConversation = users.filter(
    (user) => !conversations.some(
      (conv) => conv.user1Id === user.id || conv.user2Id === user.id
    )
  );

  return (
    <>
      <div style={{ padding: 24 }}>
        <h2>{intl.formatMessage({ id: 'pages.message.title' }) || 'Nhắn tin'}</h2>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<MessageOutlined />} onClick={() => setIsCreateModalOpen(true)}>
            {intl.formatMessage({ id: 'pages.message.create' }) || 'Tạo cuộc trò chuyện'}
          </Button>
        </Space>
        <List
          dataSource={conversations}
          renderItem={(conversation) => {
            const otherUser = getOtherUser(conversation);
            const lastMessage = conversation.messages?.[0];
            const menuItems = [
              {
                key: 'delete',
                label: intl.formatMessage({ id: 'pages.common.delete' }),
                onClick: () => handleDeleteConversation(conversation.id),
                danger: true,
              },
            ];
            return (
              <List.Item
                onClick={() => handleConversationClick(conversation)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: conversation.hasUnread ? '#e6f7ff' : 'transparent',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 8,
                }}
                extra={
                  <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                }
              >
                <List.Item.Meta
                  avatar={<Avatar>{otherUser?.fullName?.[0] || "U"}</Avatar>}
                  title={<span style={{ fontWeight: conversation.hasUnread ? 'bold' : 'normal', color: conversation.hasUnread ? '#1890ff' : 'inherit' }}>{otherUser?.fullName || intl.formatMessage({ id: 'pages.common.user' })}</span>}
                  description={lastMessage?.content || intl.formatMessage({ id: 'pages.message.noMessage' })}
                />
              </List.Item>
            );
          }}
        />
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>{selectedConversation ? getOtherUser(selectedConversation).fullName : ''}</span>
            <Button
              type="default"
              icon={<PhoneOutlined />}
              onClick={handleCall}
              size="small"
              style={{ marginRight: 32 }}
            >
              {intl.formatMessage({ id: 'pages.message.call' })}
            </Button>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <div
        style={{
            height: 400,
            overflowY: 'auto',
            padding: 16,
            border: '1px solid #e9edf4',
            backgroundColor: '#f0f2f5'
        }}
        >
          {messages.map((msg) => {
            const isCurrentUser = msg.sender.id === currentUser?.id;
            const isEditing = editingMessageId === msg.id;

          const menuItems = [
            {
              key: 'edit',
              label: intl.formatMessage({ id: 'pages.common.edit' }),
              onClick: () => handleEditMessage(msg),
            },
            {
              key: 'delete',
              label: intl.formatMessage({ id: 'pages.common.delete' }),
              onClick: () => handleDeleteMessage(msg.id),
              danger: true,
            },
          ];

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    maxWidth: '80%',
                  }}
                >
                  <div
                    style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: 18,
                        backgroundColor: isCurrentUser ? '#1677ff' : '#ffffff',
                        color: isCurrentUser ? '#fff' : '#222',
                        border: isCurrentUser ? 'none' : '1px solid #e5e7eb',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        fontSize: 14
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                        <TextArea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          autoSize={{ minRows: 1, maxRows: 3 }}
                          style={{ color: 'black', backgroundColor: 'white' }}
                        />
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={handleSaveEditMessage}
                          >
                            {intl.formatMessage({ id: 'pages.common.save' })}
                          </Button>

                          <Button
                            size="small"
                            onClick={() => setEditingMessageId(null)}
                          >
                            {intl.formatMessage({ id: 'pages.common.cancel' })}
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>

                  {isCurrentUser && !isEditing && (
                    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                      <EllipsisOutlined
                        style={{
                          cursor: 'pointer',
                          fontSize: 16,
                          marginTop: 4,
                        }}
                      />
                    </Dropdown>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={intl.formatMessage({ id: 'pages.message.placeholder' })}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage}>
            {intl.formatMessage({ id: 'pages.common.send' })}
          </Button>
        </Space.Compact>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.message.selectUser' }) || 'Chọn người dùng'}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
      >
        {usersWithoutConversation.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            { intl.formatMessage({ id: 'pages.message.noMoreUsers'})}
          </p>
        ) : (
          <List
            dataSource={usersWithoutConversation}
            renderItem={(user) => (
              <List.Item
                actions={[
                  <Button
                    key="select"
                    type="primary"
                    onClick={() => handleCreateConversation(user.id)}
                  >
                    {intl.formatMessage({ id: 'pages.common.select' })}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{user.fullName[0]}</Avatar>}
                  title={user.fullName}
                  description={user.email}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
};