import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, message, Switch, Select, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import { getResidents, createResident, updateResident, deleteResident, ResidentItem } from '@/services/resident';
import { getApartments, ApartmentItem } from '@/services/apartment';

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ResidentItem | null>(null);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [allData, setAllData] = useState<ResidentItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
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
      title: intl.formatMessage({ id: 'pages.resident.fullName' }),
      dataIndex: ['user', 'fullName'],
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.email' }),
      dataIndex: ['user', 'email'],
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.phone' }),
      dataIndex: ['user', 'phone'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.apartment' }),
      dataIndex: ['apartment', 'code'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.identityCard' }),
      dataIndex: 'identityCard',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.status' }),
      dataIndex: ['user', 'isActive'],
      search: false,
      render: (_, record) => (
        <Tag color={record.user?.isActive ? 'green' : 'red'}>
          {record.user?.isActive
            ? intl.formatMessage({ id: 'pages.resident.active' })
            : intl.formatMessage({ id: 'pages.resident.inactive' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.actions' }),
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.resident.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.resident.delete' })}
        </Button>,
      ],
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ResidentItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      fullName: record.user?.fullName,
      phone: record.user?.phone,
      apartmentId: record.apartment?.id,
      identityCard: record.identityCard,
      isActive: record.user?.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.resident.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.resident.deleteContent' }),
      onOk: async () => {
        try {
          await deleteResident(id);
          message.success(intl.formatMessage({ id: 'pages.resident.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.resident.deleteError' }));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      console.log('Submit values:', values); 
      if (editingRecord) {
        await updateResident(editingRecord.id, values);
        message.success(intl.formatMessage({ id: 'pages.resident.updateSuccess' }));
      } else {
        await createResident(values);
        message.success(intl.formatMessage({ id: 'pages.resident.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error: any) {
      console.error("Submit error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || intl.formatMessage({ id: 'pages.resident.actionError' });
      message.error(errorMsg);
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'fullName', label: intl.formatMessage({ id: 'pages.resident.fullName' }), type: 'text' },
    { key: 'email', label: intl.formatMessage({ id: 'pages.resident.email' }), type: 'text' },
    { key: 'phone', label: intl.formatMessage({ id: 'pages.resident.phone' }), type: 'text' },
    { key: 'apartmentCode', label: intl.formatMessage({ id: 'pages.resident.apartment' }), type: 'text' },
    { key: 'identityCard', label: intl.formatMessage({ id: 'pages.resident.identityCard' }), type: 'text' },
    {
      key: 'isActive',
      label: intl.formatMessage({ id: 'pages.resident.status' }),
      type: 'select',
      options: [
        { label: intl.formatMessage({ id: 'pages.resident.active' }), value: 'true' },
        { label: intl.formatMessage({ id: 'pages.resident.inactive' }), value: 'false' },
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
        headerTitle={intl.formatMessage({ id: 'pages.resident.title' })}
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
            placeholder={intl.formatMessage({ id: 'pages.resident.quickSearchPlaceholder' }) || 'Tìm kiếm ID, tên, email...'}
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
            {intl.formatMessage({ id: 'pages.resident.addNew' })}
          </Button>,
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
        quickSearchPlaceholder={intl.formatMessage({ id: 'Thông tin tìm kiếm' }) || 'Tìm kiếm ID, tên, em il...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord
          ? intl.formatMessage({ id: 'pages.resident.editTitle' })
          : intl.formatMessage({ id: 'pages.resident.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fullName"
            label={intl.formatMessage({ id: 'pages.resident.fullName' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.fullNameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.fullNamePlaceholder' })} />
          </Form.Item>
          {!editingRecord && (
            <>
              <Form.Item
                name="email"
                label={intl.formatMessage({ id: 'pages.resident.email' })}
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'pages.resident.emailRequired' }) },
                  { type: 'email', message: intl.formatMessage({ id: 'pages.resident.emailInvalid' }) }
                ]}
              >
                <Input placeholder={intl.formatMessage({ id: 'pages.resident.emailPlaceholder' })} />
              </Form.Item>
              <Form.Item
                name="password"
                label={intl.formatMessage({ id: 'pages.resident.password' })}
                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.passwordRequired' }) }]}
              >
                <Input.Password placeholder={intl.formatMessage({ id: 'pages.resident.passwordPlaceholder' })} />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="phone"
            label={intl.formatMessage({ id: 'pages.resident.phone' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.phonePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.resident.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.apartmentRequired' }) }]}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'pages.resident.apartmentPlaceholder' })}
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
            />
          </Form.Item>
          <Form.Item
            name="identityCard"
            label={intl.formatMessage({ id: 'pages.resident.identityCard' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.identityCardPlaceholder' })} />
          </Form.Item>
          {editingRecord && (
            <Form.Item
              name="isActive"
              label={intl.formatMessage({ id: 'pages.resident.status' })}
              valuePropName="checked"
            >
              <Switch
                checkedChildren={intl.formatMessage({ id: 'pages.resident.active' })}
                unCheckedChildren={intl.formatMessage({ id: 'pages.resident.inactive' })}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
