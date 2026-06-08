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
import { getServices, createService, updateService, deleteService, ServiceItem } from '@/services/service';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { getCurrentResident, ResidentItem } from '@/services/resident';

const { TextArea } = Input;
const { Option } = Select;

export default () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';
  const isAdmin = currentUser?.role === 'ADMIN';
  const serviceStatusSequence = ['PENDING', 'PROCESSING', 'DONE'] as const;

  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceItem | null>(null);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [currentResident, setCurrentResident] = useState<ResidentItem | null>(null);
  const [allData, setAllData] = useState<ServiceItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [createdAtSort, setCreatedAtSort] = useState<SortDirection>(null);
  const [statusSort, setStatusSort] = useState<SortDirection>(null);

  const loadApartments = async () => {
    try {
      if (isResident) {
        const residentData = await getCurrentResident();
        setCurrentResident(residentData);
        setApartments([{
          ...residentData.apartment,
          createdAt: new Date().toISOString(),
          status: residentData.apartment.status as "AVAILABLE" | "SOLD" | "RENTED" | "OCCUPIED" | "MAINTENANCE",
        }]);
      } else {
        const data = await getApartments();
        setApartments(data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách căn hộ');
    }
  };

  useEffect(() => {
    loadApartments();
  }, [isResident]);

  const getServiceTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      ELECTRIC: 'Tiền điện',
      WATER: 'Tiền nước',
      AIR_CONDITIONER: 'Điều hoà',
      INTERNET: 'Internet',
      OTHER: 'Khác',
    };
    return typeMap[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      PENDING: { text: 'Chờ xử lý', color: 'orange' },
      PROCESSING: { text: 'Đang xử lý', color: 'blue' },
      DONE: { text: 'Đã hoàn thành', color: 'green' },
    };
    return statusMap[status] || { text: status, color: 'default' };
  };

  const getNextServiceStatus = (status: ServiceItem['status']) => {
    const index = serviceStatusSequence.indexOf(status);
    if (index < 0) return status;
    return serviceStatusSequence[(index + 1) % serviceStatusSequence.length];
  };

  const handleStatusClick = async (record: ServiceItem) => {
    if (!isAdmin) return;
    const nextStatus = getNextServiceStatus(record.status);
    if (nextStatus === record.status) return;

    try {
      await updateService(record.id, { status: nextStatus });
      message.success('Cập nhật trạng thái thành công');
      actionRef.current?.reload();
    } catch (error) {
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  const columns: ProColumns<ServiceItem>[] = [
    {
      title: 'STT',
      dataIndex: 'index',
      valueType: 'index',
      width: 50,
      search: false,
    },
    {
      title: 'ID',
      dataIndex: 'serviceNumber',
      width: 75,
      search: false,
      render: (_, record) => record.serviceNumber || record.id,
    },
    {
      title: 'Căn hộ',
      dataIndex: ['apartment', 'code'],
      width: 90,
      search: false,
    },
    {
      title: 'Người yêu cầu',
      dataIndex: ['user', 'fullName'],
      width: 150,
      search: false,
    },
    {
      title: 'Loại dịch vụ',
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        ELECTRIC: { text: 'Tiền điện' },
        WATER: { text: 'Tiền nước' },
        AIR_CONDITIONER: { text: 'Điều hoà' },
        INTERNET: { text: 'Internet' },
        OTHER: { text: 'Khác' },
      },
      render: (_, record) => (
        <Tag>{getServiceTypeText(record.type)}</Tag>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      search: false,
      width: 150,
      ellipsis: true,
    },
    {
      title: (
        <Space>
          {'Trạng thái'}
          <SortIcon
            sortDirection={statusSort}
            onSort={(direction) => {
              setStatusSort(direction);
              setCreatedAtSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'status',
      width: 110,
      valueEnum: {
        PENDING: { text: 'Chờ xử lý' },
        PROCESSING: { text: 'Đang xử lý' },
        DONE: { text: 'Đã hoàn thành' },
      },
      render: (_, record) => {
        const status = getStatusConfig(record.status);
        return (
          <Tag
            color={status.color}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}
            onClick={() => isAdmin && handleStatusClick(record)}
          >
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: (
        <Space>
          {'Ngày tạo'}
          <SortIcon
            sortDirection={createdAtSort}
            onSort={(direction) => {
              setCreatedAtSort(direction);
              setStatusSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 160,
      search: false,
    },
    {
      title: 'Hành động',
      valueType: 'option',
      width: 180,
      render: (_, record) => [
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
  ];

  const handleAdd = async () => {
    setEditingRecord(null);
    form.resetFields();
    
    // Nếu là resident, đảm bảo đã load thông tin resident
    if (isResident) {
      if (!currentResident) {
        try {
          const residentData = await getCurrentResident();
          setCurrentResident(residentData);
        } catch (error) {
          message.error('Không thể tải thông tin cư dân');
          return;
        }
      }
      
      // Tự động điền apartmentId
      if (currentResident) {
        form.setFieldsValue({
          apartmentId: currentResident.apartmentId,
        });
      }
    }
    
    setIsModalOpen(true);
  };

  const handleEdit = (record: ServiceItem) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa yêu cầu dịch vụ này?',
      onOk: async () => {
        try {
          await deleteService(id);
          message.success('Xóa yêu cầu dịch vụ thành công');
          actionRef.current?.reload();
        } catch (error) {
          message.error('Xóa yêu cầu dịch vụ thất bại');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      let submitValues = { ...values };
      
      // Nếu là resident khi tạo mới, không gửi apartmentId vì backend sẽ tự động lấy
      if (!editingRecord && isResident) {
        delete submitValues.apartmentId;
      }
      
      if (editingRecord) {
        await updateService(editingRecord.id, submitValues);
        message.success('Cập nhật dịch vụ thành công');
      } else {
        await createService(submitValues);
        message.success('Tạo dịch vụ thành công');
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error('Thao tác dịch vụ thất bại');
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'apartmentCode', label: 'Căn hộ', type: 'text' },
    { key: 'requesterName', label: 'Người yêu cầu', type: 'text' },
    { key: 'description', label: 'Mô tả', type: 'text' },
    {
      key: 'type',
      label: 'Loại dịch vụ',
      type: 'select',
      options: [
        { label: 'Tiền điện', value: 'ELECTRIC' },
        { label: 'Tiền nước', value: 'WATER' },
        { label: 'Điều hoà', value: 'AIR_CONDITIONER' },
        { label: 'Internet', value: 'INTERNET' },
        { label: 'Khác', value: 'OTHER' },
      ],
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Chờ xử lý', value: 'PENDING' },
        { label: 'Đang xử lý', value: 'PROCESSING' },
        { label: 'Đã hoàn thành', value: 'DONE' },
      ],
    },
  ];

  const getFieldValue = (item: ServiceItem, field: string) => {
    switch (field) {
      case 'apartmentCode':
        return item.apartment?.code;
      case 'requesterName':
        return item.user?.fullName;
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

  const filterData = (data: ServiceItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(term) ||
        item.apartment?.code?.toLowerCase().includes(term) ||
        item.user?.fullName?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
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

    if (createdAtSort) {
      filtered = filtered.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return createdAtSort === 'asc' ? aTime - bTime : bTime - aTime;
      });
    } else if (statusSort) {
      const statusOrder: Record<string, number> = {
        PENDING: 1,
        PROCESSING: 2,
        DONE: 3,
      };
      filtered = filtered.sort((a, b) => {
        const aOrder = statusOrder[a.status] ?? 0;
        const bOrder = statusOrder[b.status] ?? 0;
        return statusSort === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      });
    } else {
      filtered.sort((a, b) => a.id.localeCompare(b.id));
    }

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
      <ProTable<ServiceItem>
        headerTitle={'Dịch vụ'}
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
            placeholder={'Tìm kiếm ID, căn hộ, tên...'}
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
            {'Lọc nâng cao'}
          </Button>,
          <Button
            key="clearFilters"
            type="default"
            style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
            onClick={handleClearFilters}
          >
            {'Xóa bộ lọc'}
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {'Thêm mới'}
          </Button>,
        ]}
        request={async () => {
          const data = await getServices();
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
        quickSearchPlaceholder={'Tìm kiếm ID, căn hộ, tên...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="apartmentId"
            label={'Căn hộ'}
            rules={[{ required: !isResident || !!editingRecord, message: 'Vui lòng chọn căn hộ' }]}
          >
            <Select
              showSearch
              placeholder={'Chọn căn hộ'}
              optionFilterProp="label"
              disabled={isResident}
              filterOption={(input, option) =>
                option?.label
                  ? option.label.toString().toLowerCase().includes(input.toLowerCase())
                  : false
              }
              options={apartments.map((item) => ({
                label: item.code,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label={'Loại dịch vụ'}
            rules={[{ required: true, message: 'Vui lòng chọn loại dịch vụ' }]}
          >
            <Select placeholder={'Chọn loại dịch vụ'}>
              <Option value="ELECTRIC">{'Tiền điện'}</Option>
              <Option value="WATER">{'Tiền nước'}</Option>
              <Option value="AIR_CONDITIONER">{'Điều hoà'}</Option>
              <Option value="INTERNET">{'Internet'}</Option>
              <Option value="OTHER">{'Khác'}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={'Mô tả'}
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <TextArea rows={4} placeholder={'Nhập mô tả dịch vụ'} />
          </Form.Item>

          {editingRecord && !isResident && (
            <Form.Item name="status" label={'Trạng thái'}>
              <Select placeholder={'Chọn trạng thái'}>
                <Option value="PENDING">{'Chờ xử lý'}</Option>
                <Option value="PROCESSING">{'Đang xử lý'}</Option>
                <Option value="DONE">{'Đã hoàn thành'}</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
