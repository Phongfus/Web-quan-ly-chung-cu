// Trang quản lý phương tiện (Xe)
// Mục đích file: hiển thị danh sách xe, tìm kiếm, lọc, thêm/sửa/xóa.
// Chú thích tiếng Việt được thêm cho từng hàm/khối để giúp người học hiểu luồng.
import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import SortIcon, { SortDirection } from '@/components/SortIcon';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, VehicleItem, vehicleTypeMap } from '@/services/vehicle';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { getResidents, ResidentItem } from '@/services/resident';

const { TextArea } = Input;
const { Option } = Select;

export default () => {
  // Hook lấy thông tin người dùng hiện tại từ initialState
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // Kiểm tra role để ẩn/hiện chức năng quản lý cho resident
  const isResident = currentUser?.role === 'RESIDENT';
  // actionRef dùng để reload ProTable từ bên ngoài
  const actionRef = useRef<ActionType | null>(null);
  // Modal & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleItem | null>(null);
  const [form] = Form.useForm();
  // Dữ liệu tham chiếu: căn hộ và cư dân
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [residents, setResidents] = useState<ResidentItem[]>([]);
  // Dữ liệu bảng và trạng thái tìm kiếm/lọc
  const [allData, setAllData] = useState<VehicleItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const loadApartments = async () => {
    try {
      const data = await getApartments();
      setApartments(data);
    } catch (error) {
      message.error('Không thể tải danh sách căn hộ');
    }
  };

  // Tải danh sách căn hộ (dùng cho select trong form)

  const loadResidents = async () => {
    try {
      const data = await getResidents();
      setResidents(data);
    } catch (error) {
      message.error('Không thể tải danh sách cư dân');
    }
  };

  // Tải danh sách cư dân (dùng để map ownerId khi chọn căn hộ)

  useEffect(() => {
    loadApartments();
    loadResidents();
  }, []);

  const getVehicleTypeText = (type: string) => {
    return vehicleTypeMap[type] || type;
  };

  // Chuyển mã loại xe sang chuỗi hiển thị (ví dụ: 'MOTOR' -> 'Xe máy')

  const getFieldValue = (item: VehicleItem, field: string) => {
    switch (field) {
      case 'apartmentCode':
        return item.apartment?.code;
      case 'ownerName':
        return item.owner?.user?.fullName;
      default:
        return (item as any)[field];
    }
  };

  // Lấy giá trị trường động từ item theo tên field (dùng cho lọc nâng cao)

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
      default:
        return false;
    }
  };

  // Áp dụng toán tử lọc đơn giản (eq, ne, contains, isEmpty...)

  const filterData = (data: VehicleItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.apartment?.code ?? '').toLowerCase().includes(term) ||
        (item.owner?.user?.fullName ?? '').toLowerCase().includes(term) ||
        (item.licensePlate ?? '').toLowerCase().includes(term)
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

    return filtered;
  };

  // filterData: áp dụng quickSearch và các filterRows vào bộ dữ liệu

  const handleCreate = async (values: any) => {
    try {
      await createVehicle(values);
      message.success('Tạo xe thành công');
      setIsModalOpen(false);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error) {
      message.error('Thao tác xe thất bại');
    }
  };

  // Tạo mới xe: gọi API createVehicle, reload table khi thành công

  const handleUpdate = async (values: any) => {
    if (!editingRecord) return;
    try {
      await updateVehicle(editingRecord.id, values);
      message.success('Cập nhật xe thành công');
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error) {
      message.error('Thao tác xe thất bại');
    }
  };

  // Cập nhật xe hiện tại (editingRecord)

  const handleDelete = async (record: VehicleItem) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa xe này?',
      onOk: async () => {
        try {
          await deleteVehicle(record.id);
          message.success('Xóa xe thành công');
          actionRef.current?.reload();
        } catch (error) {
          message.error('Xóa xe thất bại');
        }
      },
    });
  };

  // Xóa xe: xác nhận rồi gọi API deleteVehicle

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Mở modal để thêm mới

  const handleEdit = (record: VehicleItem) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    // Set ownerId based on apartmentId
    if (record.apartmentId) {
      const resident = residents.find(r => r.apartmentId === record.apartmentId);
      if (resident) {
        form.setFieldsValue({ ownerId: resident.id });
      }
    }
    setIsModalOpen(true);
  };

  // Mở modal để sửa, và set giá trị ownerId dựa trên apartmentId nếu có

  const handleValuesChange = (changedValues: any) => {
    if (changedValues.apartmentId) {
      const selectedApartmentId = changedValues.apartmentId;
      const resident = residents.find(r => r.apartmentId === selectedApartmentId);
      if (resident) {
        form.setFieldsValue({ ownerId: resident.id });
      }
    }
  };

  // Khi thay đổi apartmentId trong form, tự động set ownerId tương ứng nếu tìm thấy cư dân

  const handleFilterSubmit = (values: { quickSearch: string; filters: FilterRowItem[] }) => {
    setQuickSearch(values.quickSearch || '');
    setFilterRows(values.filters || []);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  // Áp dụng filter từ AdvancedFilterDrawer vào state và reload bảng

  const handleClearFilters = () => {
    setQuickSearch('');
    setSearchText('');
    setFilterRows([]);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  // Xóa nhanh các filter và reset quickSearch

  const handleExternalSearch = (value: string) => {
    setQuickSearch(value);
    setSearchText(value);
    actionRef.current?.reload();
  };

  // Tìm kiếm từ toolbar (Input.Search) — cập nhật quickSearch và reload

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  // Hủy modal, reset trạng thái editing

  const columns: ProColumns<VehicleItem>[] = [
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
      key: 'id',
      width: 80,
      search: false,
    },
    {
      title: 'Loại xe',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_, record) => (<Tag color="blue">{getVehicleTypeText(record.type)}</Tag>),
      search: false,
    },
    {
      title: 'Biển số',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      width: 120,
      search: false,
    },
    {
      title: 'Căn hộ',
      dataIndex: ['apartment', 'code'],
      key: 'apartment',
      width: 100,
      search: false,
    },
    {
      title: 'Chủ xe',
      dataIndex: ['owner', 'user', 'fullName'],
      key: 'owner',
      width: 150,
      search: false,
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      valueType: 'date',
      search: false,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 130,
      search: false,
      hideInTable: isResident,
      render: (_, record) => {
        if (isResident) return null;
        return (
          <Space size="middle">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {'Sửa'}
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              {'Xóa'}
            </Button>
          </Space>
        );
      },
    },
  ];

  // Cấu hình các cột cho ProTable
  // - Hiển thị thông tin cơ bản của xe: loại, biển số, căn hộ, chủ, ngày đăng ký
  // - Cột hành động chỉ hiển thị với tài khoản không phải resident

  const filterFields: FilterFieldDefinition[] = [
    {
      key: 'type',
      label: 'Loại xe',
      type: 'select',
      options: Object.entries(vehicleTypeMap).map(([key, value]) => ({
        label: value,
        value: key,
      })),
    },
    {
      key: 'apartmentId',
      label: 'Căn hộ',
      type: 'select',
      options: apartments.map(a => ({
        label: a.code,
        value: a.id,
      })),
    },
    {
      key: 'ownerId',
      label: 'Chủ xe',
      type: 'select',
      options: residents.map(r => ({
        label: r.user?.fullName || '',
        value: r.id,
      })),
    },
    {
      key: 'licensePlate',
      label: 'Biển số',
      type: 'text',
    },
  ];

  // Định nghĩa các trường cho AdvancedFilterDrawer
  // Người dùng có thể lọc theo type, apartmentId, ownerId, licensePlate

  return (
    <>
      <ProTable<VehicleItem>
        headerTitle={'Xe'}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
        scroll={{ x: 'max-content', y: 'max-content' }}
        toolBarRender={() => {
          const toolbarItems = [
            <Input.Search
              key="search"
              placeholder={'Tìm kiếm căn hộ, chủ xe, biển số...'}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={handleExternalSearch}
              style={{ width: 240 }}
              allowClear
            />,
            <Button key="filter" type="default" onClick={() => setFilterDrawerOpen(true)}>
              {'Lọc nâng cao'}
            </Button>,
            <Button key="clearFilters" type="default" style={{ color: '#fa8c16', borderColor: '#fa8c16' }} onClick={handleClearFilters}>
              {'Xóa bộ lọc'}
            </Button>,
          ];

          if (!isResident) {
            toolbarItems.push(
              <Button
                key="button"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                type="primary"
              >
                {'Thêm mới'}
              </Button>,
            );
          }

          return toolbarItems;
        }}
        request={async () => {
          try {
            const data = await getVehicles();
            const filteredData = filterData(data);
            setAllData(filteredData);
            return {
              data: filteredData,
              success: true,
            };
          } catch (error) {
            return {
              data: [],
              success: false,
            };
          }
        }}
        columns={columns}
      />

      <Modal
        title={editingRecord ? 'Cập nhật xe' : 'Thêm xe mới'}
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        {/* Modal chứa form tạo/cập nhật xe */}
        <Form
          form={form}
          layout="vertical"
          onFinish={editingRecord ? handleUpdate : handleCreate}
          onValuesChange={handleValuesChange}
        >
          <Form.Item
            name="type"
            label={'Loại xe'}
            rules={[{ required: true, message: 'Vui lòng chọn loại xe' }]}
          >
            <Select placeholder={'Chọn loại xe'}>
              {Object.entries(vehicleTypeMap).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="licensePlate"
            label={'Biển số'}
          >
            <Input placeholder={'Nhập biển số'} />
          </Form.Item>
          <Form.Item
            name="apartmentId"
            label={'Căn hộ'}
            rules={[{ required: true, message: 'Vui lòng chọn căn hộ' }]}
          >
            <Select
              showSearch
              placeholder={'Chọn căn hộ'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                option?.label
                  ? option.label.toString().toLowerCase().includes(input.toLowerCase())
                  : false
              }
              options={apartments.map((apartment) => ({
                label: apartment.code,
                value: apartment.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="ownerId"
            label={'Chủ xe'}
          >
            <Select
              showSearch
              placeholder={'Chọn chủ xe'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                option?.label
                  ? option.label.toString().toLowerCase().includes(input.toLowerCase())
                  : false
              }
              options={residents.map((resident) => ({
                label: resident.user?.fullName || '',
                value: resident.id,
              }))}
              disabled
            />
          </Form.Item>
        </Form>
      </Modal>

      <AdvancedFilterDrawer
        visible={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterSubmit}
        onClear={handleClearFilters}
        fields={filterFields}
        quickSearchPlaceholder={'Tìm kiếm căn hộ, chủ xe, biển số...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />
    </>
  );
};