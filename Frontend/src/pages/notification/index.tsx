import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, message, Form, Input, Select, Divider, Row, Col, Card, Typography, Space, Modal, Popconfirm } from 'antd';
import { CheckCircleOutlined, BellOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useAccess, useIntl, useModel } from '@umijs/max';
import { getNotifications, markAsRead, markAllAsRead, NotificationItem, getUnreadCount, createNotification, deleteNotification } from '@/services/notification';
import { getResidents, ResidentItem } from '@/services/resident';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { on } from '@/services/socket';
import { initSocketClient, connectSocket } from '@/services/socket';

type RecipientMode = 'all' | 'floor' | 'apartment' | 'users';

export default () => {
  const intl = useIntl();

  const recipientModeOptions: { label: string; value: RecipientMode }[] = [
    { label: intl.formatMessage({ id: 'pages.notification.recipientMode.all' }), value: 'all' },
    { label: intl.formatMessage({ id: 'pages.notification.recipientMode.floor' }), value: 'floor' },
    { label: intl.formatMessage({ id: 'pages.notification.recipientMode.apartment' }), value: 'apartment' },
    { label: intl.formatMessage({ id: 'pages.notification.recipientMode.users' }), value: 'users' },
  ];
  const actionRef = useRef<ActionType | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const access = useAccess();
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  useEffect(() => {
    if (initialState?.currentUser?.id) {
      console.log("🔌 connect socket notification");

      const socket = initSocketClient();

      socket.connect(); // 🔥 BẮT BUỘC

      socket.on("connect", () => {
        console.log("✅ connected, join user");

        connectSocket(initialState.currentUser!.id);
      });
    }
  }, [initialState]);
  const [residents, setResidents] = useState<ResidentItem[]>([]);
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('all');
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>();
  const [selectedApartment, setSelectedApartment] = useState<string | undefined>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  };

  const loadResidents = async () => {
    try {
      const data = await getResidents();
      setResidents(data);
    } catch (error) {
      console.error('Load residents error:', error);
    }
  };

  const loadApartments = async () => {
    try {
      const data = await getApartments();
      setApartments(data);
    } catch (error) {
      console.error('Load apartments error:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (access.isAdmin) {
      loadResidents();
      loadApartments();
    }
  }, [access.isAdmin]);

  // Socket listeners for real-time updates
  useEffect(() => {
    // Listen for new notifications
    const unsubscribeNewNotif = on('notification:new', () => {
      actionRef.current?.reload();
      loadUnreadCount();
    });

    // Listen for notification read events
    const unsubscribeReadNotif = on('notification:read', () => {
      actionRef.current?.reload();
      loadUnreadCount();
    });

    // Listen for all notifications read
    const unsubscribeAllReadNotif = on('notification:allread', () => {
      actionRef.current?.reload();
      setUnreadCount(0);
    });

    // Listen for unread count updates
    const unsubscribeCountUpdated = on('notification:count-updated', (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        loadUnreadCount();
      }
    });

    return () => {
      unsubscribeNewNotif();
      unsubscribeReadNotif();
      unsubscribeAllReadNotif();
      unsubscribeCountUpdated();
    };
  }, []);

  const availableFloors = Array.from(
    new Set(
      apartments
        .map((apartment) => apartment.floor?.number)
        .filter((value): value is number => typeof value === 'number'),
    ),
  ).sort((a, b) => a - b);

  const residentOptions = residents.map((resident) => ({
    label: `${resident.user.fullName} (${resident.apartment?.code ?? intl.formatMessage({ id: 'pages.notification.noApartment' })})`,
    value: resident.user.id,
  }));

  const getTargetUserIds = () => {
    if (recipientMode === 'all') {
      return residents.map((resident) => resident.user.id);
    }

    if (recipientMode === 'floor') {
      if (selectedFloor === undefined) {
        return [];
      }
      const apartmentIds = apartments
        .filter((apartment) => apartment.floor?.number === selectedFloor)
        .map((apartment) => apartment.id);
      return residents
        .filter((resident) => resident.apartmentId && apartmentIds.includes(resident.apartmentId))
        .map((resident) => resident.user.id);
    }

    if (recipientMode === 'apartment') {
      if (!selectedApartment) {
        return [];
      }
      return residents
        .filter((resident) => resident.apartmentId === selectedApartment)
        .map((resident) => resident.user.id);
    }

    if (recipientMode === 'users') {
      return form.getFieldValue('userIds') || [];
    }

    return [];
  };

  const handleMarkAsRead = async (record: NotificationItem) => {
    try {
      await markAsRead(record.id);
      message.success(intl.formatMessage({ id: 'pages.notification.messages.markReadSuccess' }));
      // Socket event will automatically update the table and unread count
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.notification.messages.markReadError' }));
    }
  };

  const handleDeleteNotification = async (record: NotificationItem) => {
    try {
      await deleteNotification(record.id);
      message.success(intl.formatMessage({ id: 'pages.notification.messages.deleteSuccess' }));
      actionRef.current?.reload();
      loadUnreadCount();
      if (selectedNotification?.id === record.id) {
        setDetailModalVisible(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.notification.messages.deleteError' }));
    }
  };

  const handleCreate = async (values: any) => {
    const userIds = getTargetUserIds();

    if (!userIds.length) {
      message.error(intl.formatMessage({ id: 'pages.notification.messages.invalidRecipient' }));
      return;
    }

    try {
      await createNotification({
        title: values.title,
        content: values.content,
        userIds,
      });
      message.success(intl.formatMessage({ id: 'pages.notification.messages.createSuccess' }));
      form.resetFields();
      setRecipientMode('all');
      setSelectedFloor(undefined);
      setSelectedApartment(undefined);
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.notification.messages.createError' }));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      message.success(intl.formatMessage({ id: 'pages.notification.messages.allReadSuccess' }));
      // Socket event will automatically update the table and unread count
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.notification.messages.allReadError' }));
    }
  };

  const handleViewDetail = async (record: NotificationItem) => {
    setSelectedNotification(record);
    setDetailModalVisible(true);

    // Nếu thông báo chưa đọc, đánh dấu đã đọc
    if (!record.isRead) {
      try {
        await markAsRead(record.id);
        // Socket event will automatically update the table and unread count
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }
  };

  const columns: ProColumns<NotificationItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.notification.table.title' }),
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.notification.table.content' }),
      dataIndex: 'content',
      width: 300,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.notification.table.status' }),
      dataIndex: 'isRead',
      width: 120,
      render: (isRead) => (
        <Tag color={isRead ? 'green' : 'orange'}>
          {isRead
            ? intl.formatMessage({ id: 'pages.notification.status.read' })
            : intl.formatMessage({ id: 'pages.notification.status.unread' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.notification.table.time' }),
      dataIndex: 'createdAt',
      width: 150,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.notification.table.actions' }),
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            key="view"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {intl.formatMessage({ id: 'pages.notification.action.detail' })}
          </Button>
          {!record.isRead && (
            <Button
              key="read"
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAsRead(record)}
            >
              {intl.formatMessage({ id: 'pages.notification.action.markRead' })}
            </Button>
          )}
          <Popconfirm
            key="delete"
            title={intl.formatMessage({ id: 'pages.notification.deleteConfirm' })}
            onConfirm={() => handleDeleteNotification(record)}
            okText={intl.formatMessage({ id: 'pages.notification.deleteOk' })}
            cancelText={intl.formatMessage({ id: 'pages.notification.deleteCancel' })}
          >
            <Button key="deleteBtn" danger size="small" icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'pages.notification.action.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (access.isAdmin) {
    const formValues = form.getFieldsValue();
    const previewTitle = formValues.title || intl.formatMessage({ id: 'pages.notification.preview.defaultTitle' });
    const previewContent = formValues.content || intl.formatMessage({ id: 'pages.notification.preview.defaultContent' });
    const currentTime = new Date().toLocaleString(intl.locale || 'en-US');

    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: '30px' }}>
          {intl.formatMessage({ id: 'pages.notification.createTitle' })}
        </Typography.Title>

        <Row gutter={24}>
          {/* Bên trái: Form nhập liệu */}
          <Col span={12}>
            <Card title={intl.formatMessage({ id: 'pages.notification.form.title' })} bordered={false}>
              <Form form={form} layout="vertical" onFinish={handleCreate}>
                <Form.Item
                  name="title"
                  label={intl.formatMessage({ id: 'pages.notification.form.titleLabel' })}
                  rules={[{ required: true, message: intl.formatMessage({ id: 'pages.notification.form.titleRequired' }) }]}
                >
                  <Input placeholder={intl.formatMessage({ id: 'pages.notification.form.titlePlaceholder' })} />
                </Form.Item>

                <Form.Item
                  name="content"
                  label={intl.formatMessage({ id: 'pages.notification.form.contentLabel' })}
                  rules={[{ required: true, message: intl.formatMessage({ id: 'pages.notification.form.contentRequired' }) }]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder={intl.formatMessage({ id: 'pages.notification.form.contentPlaceholder' })}
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>

                <Form.Item label={intl.formatMessage({ id: 'pages.notification.form.recipientLabel' })}>
                  <Select
                    value={recipientMode}
                    onChange={(value) => {
                      setRecipientMode(value as RecipientMode);
                      setSelectedFloor(undefined);
                      setSelectedApartment(undefined);
                      form.setFieldsValue({ userIds: [] });
                    }}
                    options={recipientModeOptions as any}
                  />
                </Form.Item>

                {recipientMode === 'floor' && (
                  <Form.Item label={intl.formatMessage({ id: 'pages.notification.form.chooseFloor' })} required>
                    <Select
                      placeholder={intl.formatMessage({ id: 'pages.notification.form.chooseFloor' })}
                      value={selectedFloor}
                      onChange={(value) => setSelectedFloor(value)}
                      options={availableFloors.map((floor) => ({
                        label: `${intl.formatMessage({ id: 'pages.notification.form.floorLabel' }, { floor })}`,
                        value: floor,
                      }))}
                    />
                  </Form.Item>
                )}

                {recipientMode === 'apartment' && (
                  <Form.Item label={intl.formatMessage({ id: 'pages.notification.form.chooseApartment' })} required>
                    <Select
                      placeholder={intl.formatMessage({ id: 'pages.notification.form.chooseApartment' })}
                      value={selectedApartment}
                      onChange={(value) => setSelectedApartment(value)}
                      options={apartments.map((apartment) => ({
                        label: apartment.code,
                        value: apartment.id,
                      }))}
                    />
                  </Form.Item>
                )}

                {recipientMode === 'users' && (
                  <Form.Item
                    name="userIds"
                    label={intl.formatMessage({ id: 'pages.notification.form.chooseResidents' })}
                    rules={[{ required: true, message: intl.formatMessage({ id: 'pages.notification.form.chooseResidentsRequired' }) }]}
                  >
                    <Select mode="multiple" placeholder={intl.formatMessage({ id: 'pages.notification.form.chooseResidentsPlaceholder' })} options={residentOptions} />
                  </Form.Item>
                )}

                <Form.Item style={{ marginTop: '20px' }}>
                  <Space>
                    <Button type="primary" htmlType="submit" size="large">
                      {intl.formatMessage({ id: 'pages.notification.form.sendButton' })}
                    </Button>
                    <Button onClick={() => form.resetFields()} size="large">
                      {intl.formatMessage({ id: 'pages.notification.form.resetButton' })}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Bên phải: Preview thông báo */}
          <Col span={12}>
            <Card title={intl.formatMessage({ id: 'pages.notification.preview.title' })} bordered={false}>
              <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fafafa',
                minHeight: '400px'
              }}>
                {/* Header của thông báo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e8e8e8'
                }}>
                  <BellOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
                  <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                    {intl.formatMessage({ id: 'pages.notification.preview.header' })}
                  </Typography.Title>
                </div>

                {/* Nội dung thông báo */}
                <div style={{ marginBottom: '16px' }}>
                  <Typography.Title level={5} style={{ margin: '0 0 12px 0', color: '#262626' }}>
                    {previewTitle}
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, color: '#595959', lineHeight: '1.6' }}>
                    {previewContent}
                  </Typography.Paragraph>
                </div>

                {/* Thông tin người nhận */}
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: '#f0f8ff',
                  borderRadius: '4px',
                  border: '1px solid #bae7ff'
                }}>
                  <Typography.Text strong style={{ color: '#0050b3' }}>
                    📤 {intl.formatMessage({ id: 'pages.notification.preview.recipientLabel' })}
                  </Typography.Text>
                  <Typography.Text style={{ marginLeft: '8px', color: '#0050b3' }}>
                    {recipientMode === 'all' && intl.formatMessage({ id: 'pages.notification.preview.recipientAll' })}
                    {recipientMode === 'floor' && selectedFloor && intl.formatMessage({ id: 'pages.notification.preview.recipientFloor' }, { floor: selectedFloor })}
                    {recipientMode === 'apartment' && selectedApartment &&
                      intl.formatMessage({ id: 'pages.notification.preview.recipientApartment' }, { apartment: apartments.find(a => a.id === selectedApartment)?.code || selectedApartment })
                    }
                    {recipientMode === 'users' && intl.formatMessage({ id: 'pages.notification.preview.recipientSelectedCount' }, { count: (form.getFieldValue('userIds') || []).length })}
                  </Typography.Text>
                </div>

                {/* Thời gian */}
                <div style={{
                  marginTop: '16px',
                  textAlign: 'right',
                  color: '#8c8c8c',
                  fontSize: '12px'
                }}>
                  📅 {currentTime}
                </div>
              </div>

              {/* Thông tin thống kê */}
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                <Typography.Text strong style={{ color: '#52c41a' }}>
                  📊 {intl.formatMessage({ id: 'pages.notification.preview.statsTitle' })}
                </Typography.Text>
                <div style={{ marginTop: '8px' }}>
                  <Typography.Text>
                    • {intl.formatMessage({ id: 'pages.notification.preview.recipientCount' }, { count: getTargetUserIds().length })}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text>
                    • {intl.formatMessage({ id: 'pages.notification.preview.sendMode' }, { mode: recipientModeOptions.find(mode => mode.value === recipientMode)?.label })}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      <ProTable<NotificationItem>
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const { current = 1, pageSize = 10 } = params;
          const result = await getNotifications({
            page: current,
            limit: pageSize,
          });
          return {
            data: result.data,
            total: result.pagination.total,
            success: true,
          };
        }}
        rowKey="id"
        pagination={{
          showQuickJumper: true,
          showSizeChanger: true,
        }}
        search={false}
        toolBarRender={() => [
          <Button
            key="mark-all-read"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            {intl.formatMessage({ id: 'pages.notification.markAllRead' }, { count: unreadCount })}
          </Button>,
        ]}
        scroll={{ x: 800 }}
      />

      {/* Modal chi tiết thông báo */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '8px' }} />
            {intl.formatMessage({ id: 'pages.notification.detailModal.title' })}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            {intl.formatMessage({ id: 'pages.notification.detailModal.close' })}
          </Button>
        ]}
        width={600}
        centered
      >
        {selectedNotification && (
          <div style={{
            border: '1px solid #d9d9d9',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#fafafa',
            minHeight: '300px'
          }}>
            {/* Header của thông báo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e8e8e8'
            }}>
              <BellOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
              <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                {intl.formatMessage({ id: 'pages.notification.preview.header' })}
              </Typography.Title>
            </div>

            {/* Nội dung thông báo */}
            <div style={{ marginBottom: '16px' }}>
              <Typography.Title level={5} style={{ margin: '0 0 12px 0', color: '#262626' }}>
                {selectedNotification.title}
              </Typography.Title>
              <Typography.Paragraph style={{ margin: 0, color: '#595959', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {selectedNotification.content}
              </Typography.Paragraph>
            </div>

            {/* Trạng thái đã đọc */}
            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: selectedNotification.isRead ? '#f6ffed' : '#fff7e6',
              borderRadius: '4px',
              border: `1px solid ${selectedNotification.isRead ? '#b7eb8f' : '#ffd591'}`
            }}>
              <Typography.Text strong style={{ color: selectedNotification.isRead ? '#52c41a' : '#fa8c16' }}>
                {selectedNotification.isRead
                  ? intl.formatMessage({ id: 'pages.notification.preview.statusRead' })
                  : intl.formatMessage({ id: 'pages.notification.preview.statusUnread' })}
              </Typography.Text>
            </div>

            {/* Thời gian */}
            <div style={{
              marginTop: '16px',
              textAlign: 'right',
              color: '#8c8c8c',
              fontSize: '12px'
            }}>
              📅 {new Date(selectedNotification.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};