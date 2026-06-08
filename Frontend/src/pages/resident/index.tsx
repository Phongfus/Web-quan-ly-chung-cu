import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, message, Switch, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import { getResidents, createResident, updateResident, deleteResident, ResidentItem } from '@/services/resident';
import { getApartments, getAvailableApartments, ApartmentItem } from '@/services/apartment';

export default () => {
  
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ResidentItem | null>(null);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [allData, setAllData] = useState<ResidentItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const loadApartments = async (isAddMode: boolean = true) => {
    try {
      // Khi thêm cư dân mới, chỉ tải những căn hộ không có cư dân
      // Khi sửa, tải tất cả các căn hộ
      const data = isAddMode ? await getAvailableApartments() : await getApartments();
      setApartments(data);
    } catch (error) {
      message.error('Không thể tải danh sách căn hộ');
    }
  };

  useEffect(() => {
    loadApartments();
  }, []);

  const columns: ProColumns<ResidentItem>[] = [
    {
      title: 'STT',
      dataIndex: 'index',
      valueType: 'index',
      width: 60,
      search: false,
    },
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: 'Họ tên',
      dataIndex: ['user', 'fullName'],
    },
    {
      title: 'Email',
      dataIndex: ['user', 'email'],
    },
    {
      title: 'Số điện thoại',
      dataIndex: ['user', 'phone'],
      search: false,
    },
    {
      title: 'Căn hộ',
      dataIndex: ['apartment', 'code'],
      search: false,
    },
    {
      title: 'CMND/CCCD',
      dataIndex: 'identityCard',
      search: false,
    },
    {
      title: 'Trạng thái',
      dataIndex: ['user', 'isActive'],
      search: false,
      render: (_, record) => (
        <Tag color={record.user?.isActive ? 'green' : 'red'}>
          {record.user?.isActive ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
...(isResident
  ? []
  : [
      {
        title: 'Thao tác',
        valueType: 'option' as const,
        width: 180,
        render: (_: unknown, record: ResidentItem) => [
          <Button
            key="edit"
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {'Sửa'}
          </Button>,
          <Button
            key="delete"
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            {'Xóa'}
          </Button>,
        ],
      },
    ]),
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ email: '' });
    loadApartments(true); // Tải căn hộ có sẵn
    setIsModalOpen(true);
  };

  const handleEdit = (record: ResidentItem) => {
    setEditingRecord(record);
    loadApartments(false); // Tải tất cả căn hộ
    form.setFieldsValue({
      fullName: record.user?.fullName,
      phone: record.user?.phone,
      apartmentId: record.apartment?.id,
      apartmentStatus: record.apartment?.status,
      identityCard: record.identityCard,
      isActive: record.user?.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa?',
      content: 'Bạn có chắc muốn xóa cư dân này?',
      onOk: async () => {
        try {
          await deleteResident(id);
          message.success('Đã xóa thành công');
          actionRef.current?.reload();
        } catch (error) {
          message.error('Xóa thất bại');
        }
      },
    });
  };

  const normalizeResidentEmail = (email: string) => {
    const localPart = String(email || '').trim().split('@')[0];
    return `${localPart}@gmail.com`;
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = editingRecord
        ? values
        : { ...values, email: normalizeResidentEmail(values.email) };

      if (editingRecord) {
        await updateResident(editingRecord.id, payload);
        message.success('Cập nhật thành công');
      } else {
        await createResident(payload);
        message.success('Tạo mới thành công');
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error: any) {
      console.error("Submit error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Thao tác thất bại';
      message.error(errorMsg);
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'fullName', label: 'Họ tên', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Số điện thoại', type: 'text' },
    { key: 'apartmentCode', label: 'Căn hộ', type: 'text' },
    { key: 'identityCard', label: 'CMND/CCCD', type: 'text' },
    {
      key: 'isActive',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Hoạt động', value: 'true' },
        { label: 'Không hoạt động', value: 'false' },
      ],
    },
  ];

  const getFieldValue = (item: ResidentItem, field: string) => {
    switch (field) {
      case 'fullName':
        return item.user?.fullName;
      case 'email':
        return item.user?.email;
      case 'phone':
        return item.user?.phone;
      case 'apartmentCode':
        return item.apartment?.code;
      case 'isActive':
        return String(item.user?.isActive);
      default:
        return (item as any)[field];
    }
  };

  const applyOperator = (value: any, operator: string, compare: any) => {
    if (operator === 'isEmpty') {
      return value === undefined || value === null || value === '';
    }
    if (operator === 'isNotEmpty') {
      return value !== undefined && value !== null && value !== '';
    }

    if (value === undefined || value === null) {
      return false;
    }

    const stringValue = String(value).toLowerCase();
    const compareValue = String(compare ?? '').toLowerCase();

    switch (operator) {
      case 'eq':
        return stringValue === compareValue;
      case 'ne':
        return stringValue !== compareValue;
      case 'contains':
        return stringValue.includes(compareValue);
      case 'notContains':
        return !stringValue.includes(compareValue);
      case 'gt':
        return Number(value) > Number(compare);
      case 'lt':
        return Number(value) < Number(compare);
      case 'gte':
        return Number(value) >= Number(compare);
      case 'lte':
        return Number(value) <= Number(compare);
      default:
        return false;
    }
  };

  const filterData = (data: ResidentItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(term) ||
        item.user?.fullName?.toLowerCase().includes(term) ||
        item.user?.email?.toLowerCase().includes(term) ||
        item.apartment?.code?.toLowerCase().includes(term)
      );
    }

    if (filterRows.length > 0) {
      filtered = filtered.filter((item) =>
        filterRows.every((row) => {
          const value = getFieldValue(item, row.field);
          if (row.operator === 'isEmpty') {
            return value === undefined || value === null || value === '';
          }
          if (row.operator === 'isNotEmpty') {
            return value !== undefined && value !== null && value !== '';
          }
          return applyOperator(value, row.operator, row.value);
        }),
      );
    }

    // Sắp xếp theo ID tăng dần
    filtered.sort((a, b) => a.id.localeCompare(b.id));

    return filtered;
  };

  const handleFilterSubmit = (values: { quickSearch: string; filters: FilterRowItem[] }) => {
    setQuickSearch(values.quickSearch || '');
    setFilterRows(values.filters || []);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  const handleClearFilters = () => {
    setQuickSearch('');
    setFilterRows([]);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  return (
    <>
      <ProTable<ResidentItem>
        headerTitle={'Quản lý cư dân'}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
        scroll={{ x: 'max-content', y: 'max-content' }}
        toolBarRender={() => [
          <Input.Search
            key="quickSearch"
            placeholder={'Tìm kiếm ID, tên, email...'}
            allowClear
            style={{ width: 320 }}
            value={quickSearch}
            onSearch={(value) => {
              setQuickSearch(value);
              actionRef.current?.reload();
            }}
            onChange={(e) => setQuickSearch(e.target.value)}
          />,
          <Button
            key="filter"
            type="default"
            onClick={() => setFilterDrawerOpen(true)}
          >
            {'Bộ lọc nâng cao'}
          </Button>,
          <Button
            key="clearFilters"
            type="default"
            style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
            onClick={handleClearFilters}
          >
            {'Xóa bộ lọc'}
          </Button>,
          ...(isResident
            ? []
            : [
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  {'Thêm mới'}
                </Button>,
              ]),
        ]}
        request={async () => {
          const data = await getResidents();
          setAllData(data);
          const filteredData = filterData(data);
          return {
            data: filteredData,
            success: true,
          };
        }}
        columns={columns}
      />

      <AdvancedFilterDrawer
        visible={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterSubmit}
        onClear={handleClearFilters}
        fields={filterFields}
        quickSearchPlaceholder={'Tìm kiếm ID, tên, email...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord ? 'Cập nhật cư dân' : 'Thêm cư dân mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fullName"
            label={'Họ tên'}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder={'Nhập họ tên'} />
          </Form.Item>
          {!editingRecord && (
            <>
              <Form.Item
                name="email"
                label={'Email'}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  {
                    validator: (_, value) => {
                      if (!value || String(value).trim() === '') {
                        return Promise.reject(new Error('Vui lòng nhập email'));
                      }
                      if (String(value).includes('@')) {
                        return Promise.reject(new Error('Vui lòng chỉ nhập phần trước @gmail.com'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder=""
                  addonAfter="@gmail.com"
                  autoComplete="off"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={'Mật khẩu'}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              >
                <Input.Password placeholder={'Nhập mật khẩu'} />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="phone"
            label={'Số điện thoại'}
          >
            <Input placeholder={'Nhập số điện thoại'} />
          </Form.Item>
          <Form.Item
            name="apartmentId"
            label={'Căn hộ'}
            rules={[{ required: true, message: 'Vui lòng chọn căn hộ' }]}
          >
            <Select
              showSearch
              placeholder={'Nhập ID căn hộ'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                option?.label
                  ? option.label.toString().toLowerCase().includes(input.toLowerCase())
                  : false
              }
              options={apartments.map((item) => ({
                label: item.code,
                value: item.id,
              }))}
              onChange={(value) => {
                const selectedApartment = apartments.find((a) => a.id === value);
                if (selectedApartment && selectedApartment.status) {
                  form.setFieldValue('apartmentStatus', selectedApartment.status);
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="apartmentStatus"
            label={'Trạng thái căn hộ'}
            rules={[{ required: !editingRecord, message: 'Vui lòng chọn trạng thái căn hộ' }]}
          >
            <Select placeholder={'Chọn trạng thái căn hộ'}>
              <Select.Option value="RENTED">{'Thuê nhà '}</Select.Option>
              <Select.Option value="SOLD">{'Nhà mua '}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="identityCard"
            label={'CMND/CCCD'}
          >
            <Input placeholder={'Nhập số CMND/CCCD'} />
          </Form.Item>
          {editingRecord && (
            <Form.Item
              name="isActive"
              label={'Trạng thái'}
              valuePropName="checked"
            >
              <Switch checkedChildren={'Hoạt động'} unCheckedChildren={'Không hoạt động'} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
