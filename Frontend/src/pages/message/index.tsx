import { useState, useEffect, useRef } from 'react';
import { List, Avatar, Button, Modal, Input, message, Space, Dropdown } from 'antd';
import { MessageOutlined, SendOutlined, EllipsisOutlined, PhoneOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { getConversations, getMessages, sendMessage, createConversation, ConversationItem, MessageItem, updateMessage, deleteMessage, deleteConversation } from '@/services/message';
import { getUsers, UserItem } from '@/services/user';
import { on, joinConversation, leaveConversation } from '@/services/socket';

const { TextArea } = Input;

type LocalConversationItem = ConversationItem & { hasUnread: boolean };

export default () => {
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
  const selectedConversationRef = useRef<LocalConversationItem | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

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
      message.error('Tải cuộc trò chuyện thất bại');
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
      message.error('Tải danh sách người dùng thất bại');
    }
  };

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    // Socket listeners for real-time updates
    const unsubscribeNewMessage = on('message:new', (newMessage: MessageItem) => {
      if (selectedConversationRef.current?.id === newMessage.conversationId) {
        setMessages((prev: MessageItem[]) =>
          prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage],
        );
      }
      loadConversations();
    });

    const unsubscribeConversationUpdated = on('conversation:updated', () => {
      loadConversations();
    });

    const unsubscribeConversationNew = on('conversation:new', () => {
      loadConversations();
    });

    const unsubscribeMessageUpdated = on('message:updated', (updatedMessage: MessageItem) => {
      if (selectedConversationRef.current?.id === updatedMessage.conversationId) {
        setMessages((prev: MessageItem[]) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
      }
      loadConversations();
    });

    const unsubscribeMessageDeleted = on('message:deleted', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (selectedConversationRef.current?.id === conversationId) {
        setMessages((prev: MessageItem[]) => prev.filter((m) => m.id !== messageId));
      }
      loadConversations();
    });

    const unsubscribeConversationDeleted = on('conversation:deleted', ({ conversationId }: { conversationId: string }) => {
      setConversations((prev: LocalConversationItem[]) => prev.filter((conv) => conv.id !== conversationId));
      if (selectedConversationRef.current?.id === conversationId) {
        setIsModalOpen(false);
        setSelectedConversation(null);
        selectedConversationRef.current = null;
        activeConversationIdRef.current = null;
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeConversationUpdated();
      unsubscribeConversationNew();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      unsubscribeConversationDeleted();
    };
  }, []);

  const handleConversationClick = async (conversation: LocalConversationItem) => {
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;
    setIsModalOpen(true);

    // Join new conversation and leave previous one
    if (activeConversationIdRef.current && activeConversationIdRef.current !== conversation.id) {
      leaveConversation(activeConversationIdRef.current);
    }
    joinConversation(conversation.id);
    activeConversationIdRef.current = conversation.id;

    try {
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
      await loadConversations();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      message.error('Tải tin nhắn thất bại');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      const msg = await sendMessage(selectedConversation.id, newMessage.trim());
      setNewMessage('');
      await loadConversations();
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      message.error('Gửi tin nhắn thất bại');
    }
  };

  const handleCreateConversation = async (userId: string) => {
    try {
      const conv = await createConversation(userId);
      setConversations((prev: LocalConversationItem[]) => [{ ...conv, hasUnread: false }, ...prev]);
      setIsCreateModalOpen(false);
      message.success('Tạo cuộc trò chuyện thành công');
    } catch (error) {
      message.error('Tạo cuộc trò chuyện thất bại');
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
      setMessages((prev: MessageItem[]) => prev.map((m) => m.id === editingMessageId ? updatedMsg : m));
      setEditingMessageId(null);
      setEditingContent('');
      message.success('Cập nhật tin nhắn thành công');
    } catch (error) {
      message.error('Cập nhật tin nhắn thất bại');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa tin nhắn',
      content: 'Bạn có chắc chắn muốn xóa tin nhắn này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMessage(messageId);
          setMessages((prev: MessageItem[]) => prev.filter((m) => m.id !== messageId));

          message.success('Xóa tin nhắn thành công');
        } catch (error) {
          message.error('Xóa tin nhắn thất bại');
        }
      },
    });
  };

  const handleCall = () => {
    if (!selectedConversation) return;
    const otherUser = getOtherUser(selectedConversation);
    if (otherUser.phone) {
      navigator.clipboard.writeText(otherUser.phone);
      message.success(`Số điện thoại: ${otherUser.phone}`);
    } else {
      message.error('Không có số điện thoại');
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa cuộc trò chuyện',
      content: 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteConversation(conversationId);
          setConversations((prev: LocalConversationItem[]) => prev.filter((c) => c.id !== conversationId));
          if (selectedConversation?.id === conversationId) {
            setIsModalOpen(false);
          }
          message.success('Xóa cuộc trò chuyện thành công');
        } catch (error) {
          message.error('Xóa cuộc trò chuyện thất bại');
        }
      },
    });
  };

  const getOtherUser = (conversation: LocalConversationItem) => {
    if (!conversation?.user1 || !conversation?.user2 || !currentUser) {
      return {
        id: "",
        fullName: 'Người dùng',
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
        <h2>{'Nhắn tin'}</h2>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<MessageOutlined />} onClick={() => setIsCreateModalOpen(true)}>
            {'Tạo cuộc trò chuyện'}
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
                label: 'Xóa',
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
                  title={<span style={{ fontWeight: conversation.hasUnread ? 'bold' : 'normal', color: conversation.hasUnread ? '#1890ff' : 'inherit' }}>{otherUser?.fullName || 'Người dùng'}</span>}
                  description={lastMessage?.content || 'Chưa có tin nhắn'}
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
              {'Gọi điện'}
            </Button>
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          if (activeConversationIdRef.current) {
            leaveConversation(activeConversationIdRef.current);
            activeConversationIdRef.current = null;
          }
          setSelectedConversation(null);
          selectedConversationRef.current = null;
        }}
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
              label: 'Sửa',
              onClick: () => handleEditMessage(msg),
            },
            {
              key: 'delete',
              label: 'Xóa',
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
                            {'Lưu'}
                          </Button>

                          <Button
                            size="small"
                            onClick={() => setEditingMessageId(null)}
                          >
                            {'Hủy'}
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
            placeholder={'Nhập tin nhắn...'}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage}>
            {'Gửi'}
          </Button>
        </Space.Compact>
      </Modal>

      <Modal
        title={'Chọn người dùng'}
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
      >
        {usersWithoutConversation.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
            {'Không còn người dùng nào để thêm'}
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
                    {'Chọn'}
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