import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, message, Form, Input, Select, Divider, Row, Col, Card, Typography, Space, Modal, Popconfirm } from 'antd';
import { CheckCircleOutlined, BellOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useAccess, useModel } from '@umijs/max';
import { getNotifications, markAsRead, markAllAsRead, NotificationItem, getUnreadCount, createNotification, deleteNotification } from '@/services/notification';
import { getResidents, ResidentItem } from '@/services/resident';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { on } from '@/services/socket';
import { initSocketClient, connectSocket } from '@/services/socket';

type RecipientMode = 'all' | 'floor' | 'apartment' | 'users';

export default () => {
  const recipientModeOptions: { label: string; value: RecipientMode }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Tầng', value: 'floor' },
    { label: 'Căn hộ', value: 'apartment' },
    { label: 'Chọn người', value: 'users' },
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

      socket.connect(); 

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
    // Tải số lượng thông báo chưa đọc và cập nhật badge hiển thị
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  };

  const loadResidents = async () => {
    // Tải danh sách cư dân để dùng cho lựa chọn người nhận khi admin gửi thông báo
    try {
      const data = await getResidents();
      setResidents(data);
    } catch (error) {
      console.error('Load residents error:', error);
    }
  };

  const loadApartments = async () => {
    // Tải danh sách căn hộ để phân loại người nhận theo tầng/căn hộ
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

  // Lắng nghe socket để cập nhật thông báo thời gian thực
  useEffect(() => {
    // Lắng nghe sự kiện thông báo mới
    const unsubscribeNewNotif = on('notification:new', () => {
      actionRef.current?.reload();
      loadUnreadCount();
    });

    // Lắng nghe sự kiện thông báo đã được đánh dấu đọc
    const unsubscribeReadNotif = on('notification:read', () => {
      actionRef.current?.reload();
      loadUnreadCount();
    });

    // Lắng nghe sự kiện tất cả thông báo đã được đánh dấu đọc
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
    label: `${resident.user.fullName} (${resident.apartment?.code ?? 'Không có căn hộ'})`,
    value: resident.user.id,
  }));

  const getTargetUserIds = () => {
    // Trả về danh sách userIds theo chế độ chọn người nhận hiện tại
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
    // Đánh dấu một thông báo cụ thể là đã đọc và tin nhắn sẽ cập nhật bằng socket
    try {
      await markAsRead(record.id);
      message.success('Đánh dấu thông báo là đã đọc');
      // Sự kiện socket sẽ tự động cập nhật lại bảng và số lượng chưa đọc
    } catch (error) {
      message.error('Đánh dấu thông báo thất bại');
    }
  };

  const handleDeleteNotification = async (record: NotificationItem) => {
    // Xóa thông báo khỏi server và reload bảng sau khi xóa thành công
    try {
      await deleteNotification(record.id);
      message.success('Xóa thông báo thành công');
      actionRef.current?.reload();
      loadUnreadCount();
      if (selectedNotification?.id === record.id) {
        setDetailModalVisible(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      message.error('Xóa thông báo thất bại');
    }
  };

  const handleCreate = async (values: any) => {
    // Tạo thông báo mới với danh sách userIds đã chọn theo chế độ nhận
    const userIds = getTargetUserIds();

    if (!userIds.length) {
      message.error('Vui lòng chọn người nhận');
      return;
    }

    try {
      await createNotification({
        title: values.title,
        content: values.content,
        userIds,
      });
      message.success('Gửi thông báo thành công');
      form.resetFields();
      setRecipientMode('all');
      setSelectedFloor(undefined);
      setSelectedApartment(undefined);
      actionRef.current?.reload();
    } catch (error) {
      message.error('Gửi thông báo thất bại');
    }
  };

  const handleMarkAllAsRead = async () => {
    // Đánh dấu tất cả thông báo hiện tại là đã đọc trên server
    try {
      await markAllAsRead();
      message.success('Đánh dấu tất cả thông báo là đã đọc');
      // Sự kiện socket sẽ tự động cập nhật lại bảng và số lượng chưa đọc
    } catch (error) {
      message.error('Đánh dấu tất cả thông báo thất bại');
    }
  };

  const handleViewDetail = async (record: NotificationItem) => {
    // Mở modal xem chi tiết thông báo và nếu cần thì đánh dấu là đã đọc
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
      title: 'Tiêu đề',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      width: 300,
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isRead',
      width: 120,
      render: (isRead) => (
        <Tag color={isRead ? 'green' : 'orange'}>
          {isRead ? 'Đã đọc' : 'Chưa đọc'}
        </Tag>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      width: 150,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: 'Hành động',
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
            {'Chi tiết'}
          </Button>
          {!record.isRead && (
            <Button
              key="read"
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAsRead(record)}
            >
              {'Đánh dấu đã đọc'}
            </Button>
          )}
          <Popconfirm
            key="delete"
            title={'Xác nhận xóa'}
            onConfirm={() => handleDeleteNotification(record)}
            okText={'Xóa'}
            cancelText={'Hủy'}
          >
            <Button key="deleteBtn" danger size="small" icon={<DeleteOutlined />}>
              {'Xóa'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (access.isAdmin) {
    const formValues = form.getFieldsValue();
    const previewTitle = formValues.title || 'Tiêu đề thông báo mẫu';
    const previewContent = formValues.content || 'Nội dung thông báo mẫu';
    const currentTime = new Date().toLocaleString('vi-VN');

    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: '30px' }}>
          {'Tạo thông báo'}
        </Typography.Title>

        <Row gutter={24}>
          {/* Bên trái: Form nhập liệu */}
          <Col span={12}>
            <Card title={'Thông tin thông báo'} bordered={false}>
              <Form form={form} layout="vertical" onFinish={handleCreate}>
                <Form.Item
                  name="title"
                  label={'Tiêu đề'}
                  rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                >
                  <Input placeholder={'Nhập tiêu đề thông báo'} />
                </Form.Item>

                <Form.Item
                  name="content"
                  label={'Nội dung'}
                  rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder={'Nhập nội dung thông báo'}
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>

                <Form.Item label={'Người nhận'}>
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
                  <Form.Item label={'Chọn tầng'} required>
                    <Select
                      placeholder={'Chọn tầng'}
                      value={selectedFloor}
                      onChange={(value) => setSelectedFloor(value)}
                      options={availableFloors.map((floor) => ({
                        label: `Tầng ${floor}`,
                        value: floor,
                      }))}
                    />
                  </Form.Item>
                )}

                {recipientMode === 'apartment' && (
                  <Form.Item label={'Chọn căn hộ'} required>
                    <Select
                      placeholder={'Chọn căn hộ'}
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
                    label={'Chọn cư dân'}
                    rules={[{ required: true, message: 'Vui lòng chọn cư dân' }]}
                  >
                    <Select mode="multiple" placeholder={'Chọn cư dân'} options={residentOptions} />
                  </Form.Item>
                )}

                <Form.Item style={{ marginTop: '20px' }}>
                  <Space>
                    <Button type="primary" htmlType="submit" size="large">
                      {'Gửi'}
                    </Button>
                    <Button onClick={() => form.resetFields()} size="large">
                      {'Đặt lại'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Bên phải: Preview thông báo */}
          <Col span={12}>
            <Card title={'Xem trước thông báo'} bordered={false}>
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
                    {'Thông báo'}
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
                    {'📤 Người nhận'}
                  </Typography.Text>
                  <Typography.Text style={{ marginLeft: '8px', color: '#0050b3' }}>
                    {recipientMode === 'all' && 'Tất cả cư dân'}
                    {recipientMode === 'floor' && selectedFloor && `Tầng ${selectedFloor}`}
                    {recipientMode === 'apartment' && selectedApartment &&
                      `Căn hộ ${apartments.find(a => a.id === selectedApartment)?.code || selectedApartment}`
                    }
                    {recipientMode === 'users' && `Đã chọn ${(form.getFieldValue('userIds') || []).length} cư dân`}
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
                  {'📊 Thống kê'}
                </Typography.Text>
                <div style={{ marginTop: '8px' }}>
                  <Typography.Text>
                    {`• Số người nhận: ${getTargetUserIds().length}`}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text>
                    {`• Phương thức gửi: ${recipientModeOptions.find(mode => mode.value === recipientMode)?.label}`}
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
        // Yêu cầu dữ liệu thông báo từ API với phân trang
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
        // Nút chức năng trên thanh công cụ bảng
        toolBarRender={() => [
          <Button
            key="mark-all-read"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            {`Đánh dấu tất cả đã đọc (${unreadCount})`}
          </Button>,
        ]}
        scroll={{ x: 800 }}
      />

      {/* Modal chi tiết thông báo */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '8px' }} />
            {'Chi tiết thông báo'}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            {'Đóng'}
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
                {'Thông báo'}
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
                  ? 'Đã đọc'
                  : 'Chưa đọc'}
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