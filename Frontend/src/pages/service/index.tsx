import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import { getServices, createService, updateService, deleteService, ServiceItem } from '@/services/service';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { getCurrentResident, ResidentItem } from '@/services/resident';

const { TextArea } = Input;
const { Option } = Select;

export default () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';
  
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
      ELECTRIC: intl.formatMessage({ id: 'pages.service.type.electric' }),
      WATER: intl.formatMessage({ id: 'pages.service.type.water' }),
      AIR_CONDITIONER: intl.formatMessage({ id: 'pages.service.type.ac' }),
      INTERNET: intl.formatMessage({ id: 'pages.service.type.internet' }),
      OTHER: intl.formatMessage({ id: 'pages.service.type.other' }),
    };
    return typeMap[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      PENDING: { 
        text: intl.formatMessage({ id: 'pages.service.status.pending' }), 
        color: 'orange' 
      },
      PROCESSING: { 
        text: intl.formatMessage({ id: 'pages.service.status.processing' }), 
        color: 'blue' 
      },
      DONE: { 
        text: intl.formatMessage({ id: 'pages.service.status.done' }), 
        color: 'green' 
      },
    };
    return statusMap[status] || { text: status, color: 'default' };
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
      title: intl.formatMessage({ id: 'pages.service.apartment' }),
      dataIndex: ['apartment', 'code'],
      width: 90,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.requester' }),
      dataIndex: ['user', 'fullName'],
      width: 150,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.type' }),
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        ELECTRIC: { text: intl.formatMessage({ id: 'pages.service.type.electric' }) },
        WATER: { text: intl.formatMessage({ id: 'pages.service.type.water' }) },
        AIR_CONDITIONER: { text: intl.formatMessage({ id: 'pages.service.type.ac' }) },
        INTERNET: { text: intl.formatMessage({ id: 'pages.service.type.internet' }) },
        OTHER: { text: intl.formatMessage({ id: 'pages.service.type.other' }) },
      },
      render: (_, record) => (
        <Tag>{getServiceTypeText(record.type)}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.service.description' }),
      dataIndex: 'description',
      search: false,
      width: 150,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.status' }),
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        PENDING: { text: intl.formatMessage({ id: 'pages.service.status.pending' }) },
        PROCESSING: { text: intl.formatMessage({ id: 'pages.service.status.processing' }) },
        DONE: { text: intl.formatMessage({ id: 'pages.service.status.done' }) },
      },
      render: (_, record) => {
        const status = getStatusConfig(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.service.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 160,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.actions' }),
      valueType: 'option',
      width: 180,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.service.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.service.delete' })}
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
      title: intl.formatMessage({ id: 'pages.service.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.service.deleteContent' }),
      onOk: async () => {
        try {
          await deleteService(id);
          message.success(intl.formatMessage({ id: 'pages.service.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.service.deleteError' }));
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
        message.success(intl.formatMessage({ id: 'pages.service.updateSuccess' }));
      } else {
        await createService(submitValues);
        message.success(intl.formatMessage({ id: 'pages.service.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.service.actionError' }));
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'apartmentCode', label: intl.formatMessage({ id: 'pages.service.apartment' }), type: 'text' },
    { key: 'requesterName', label: intl.formatMessage({ id: 'pages.service.requester' }), type: 'text' },
    { key: 'description', label: intl.formatMessage({ id: 'pages.service.description' }), type: 'text' },
    {
      key: 'type',
      label: intl.formatMessage({ id: 'pages.service.type' }),
      type: 'select',
      options: [
        { label: intl.formatMessage({ id: 'pages.service.type.electric' }), value: 'ELECTRIC' },
        { label: intl.formatMessage({ id: 'pages.service.type.water' }), value: 'WATER' },
        { label: intl.formatMessage({ id: 'pages.service.type.ac' }), value: 'AIR_CONDITIONER' },
        { label: intl.formatMessage({ id: 'pages.service.type.internet' }), value: 'INTERNET' },
        { label: intl.formatMessage({ id: 'pages.service.type.other' }), value: 'OTHER' },
      ],
    },
    {
      key: 'status',
      label: intl.formatMessage({ id: 'pages.service.status' }),
      type: 'select',
      options: [
        { label: intl.formatMessage({ id: 'pages.service.status.pending' }), value: 'PENDING' },
        { label: intl.formatMessage({ id: 'pages.service.status.processing' }), value: 'PROCESSING' },
        { label: intl.formatMessage({ id: 'pages.service.status.done' }), value: 'DONE' },
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
      <ProTable<ServiceItem>
        headerTitle={intl.formatMessage({ id: 'pages.service.title' })}
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
            placeholder={intl.formatMessage({ id: 'pages.service.quickSearchPlaceholder' }) || 'Tìm kiếm ID, căn hộ, tên...'}
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
            {intl.formatMessage({ id: 'components.advancedFilter.open' }) || 'Lọc nâng cao'}
          </Button>,
          <Button
            key="clearFilters"
            onClick={handleClearFilters}
          >
            {intl.formatMessage({ id: 'components.advancedFilter.clear' }) || 'Xóa bộ lọc'}
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {intl.formatMessage({ id: 'pages.service.addNew' })}
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
        quickSearchPlaceholder={intl.formatMessage({ id: 'Thông tin tìm kiếm' }) || 'Tìm kiếm ID, căn hộ, tên...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord 
          ? intl.formatMessage({ id: 'pages.service.editTitle' }) 
          : intl.formatMessage({ id: 'pages.service.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.service.apartment' })}
            rules={[{ required: !isResident || !!editingRecord, message: intl.formatMessage({ id: 'pages.service.apartmentRequired' }) }]}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'pages.service.apartmentPlaceholder' })}
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
            label={intl.formatMessage({ id: 'pages.service.type' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.service.typeRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.service.typePlaceholder' })}>
              <Option value="ELECTRIC">{intl.formatMessage({ id: 'pages.service.type.electric' })}</Option>
              <Option value="WATER">{intl.formatMessage({ id: 'pages.service.type.water' })}</Option>
              <Option value="AIR_CONDITIONER">{intl.formatMessage({ id: 'pages.service.type.ac' })}</Option>
              <Option value="INTERNET">{intl.formatMessage({ id: 'pages.service.type.internet' })}</Option>
              <Option value="OTHER">{intl.formatMessage({ id: 'pages.service.type.other' })}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={intl.formatMessage({ id: 'pages.service.description' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.service.descriptionRequired' }) }]}
          >
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.service.descriptionPlaceholder' })} />
          </Form.Item>

          {editingRecord && !isResident && (
            <Form.Item name="status" label={intl.formatMessage({ id: 'pages.service.status' })}>
              <Select placeholder={intl.formatMessage({ id: 'pages.service.statusPlaceholder' })}>
                <Option value="PENDING">{intl.formatMessage({ id: 'pages.service.status.pending' })}</Option>
                <Option value="PROCESSING">{intl.formatMessage({ id: 'pages.service.status.processing' })}</Option>
                <Option value="DONE">{intl.formatMessage({ id: 'pages.service.status.done' })}</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
