import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
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
  const intl = useIntl();
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleItem | null>(null);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [residents, setResidents] = useState<ResidentItem[]>([]);
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

  const loadResidents = async () => {
    try {
      const data = await getResidents();
      setResidents(data);
    } catch (error) {
      message.error('Không thể tải danh sách cư dân');
    }
  };

  useEffect(() => {
    loadApartments();
    loadResidents();
  }, []);

  const getVehicleTypeText = (type: string) => {
    return vehicleTypeMap[type] || type;
  };

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

  const handleCreate = async (values: any) => {
    try {
      await createVehicle(values);
      message.success(intl.formatMessage({ id: 'pages.vehicle.createSuccess' }));
      setIsModalOpen(false);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.vehicle.actionError' }));
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editingRecord) return;
    try {
      await updateVehicle(editingRecord.id, values);
      message.success(intl.formatMessage({ id: 'pages.vehicle.updateSuccess' }));
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.vehicle.actionError' }));
    }
  };

  const handleDelete = async (record: VehicleItem) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.vehicle.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.vehicle.deleteContent' }),
      onOk: async () => {
        try {
          await deleteVehicle(record.id);
          message.success(intl.formatMessage({ id: 'pages.vehicle.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.vehicle.deleteError' }));
        }
      },
    });
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

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

  const handleValuesChange = (changedValues: any) => {
    if (changedValues.apartmentId) {
      const selectedApartmentId = changedValues.apartmentId;
      const resident = residents.find(r => r.apartmentId === selectedApartmentId);
      if (resident) {
        form.setFieldsValue({ ownerId: resident.id });
      }
    }
  };

  const handleFilterSubmit = (values: { quickSearch: string; filters: FilterRowItem[] }) => {
    setQuickSearch(values.quickSearch || '');
    setFilterRows(values.filters || []);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  const handleClearFilters = () => {
    setQuickSearch('');
    setSearchText('');
    setFilterRows([]);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  const handleExternalSearch = (value: string) => {
    setQuickSearch(value);
    setSearchText(value);
    actionRef.current?.reload();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const columns: ProColumns<VehicleItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.common.index' }),
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
      title: intl.formatMessage({ id: 'pages.vehicle.type' }),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_, record) => (<Tag color="blue">{getVehicleTypeText(record.type)}</Tag>),
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.vehicle.licensePlate' }),
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      width: 120,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.vehicle.apartment' }),
      dataIndex: ['apartment', 'code'],
      key: 'apartment',
      width: 100,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.vehicle.owner' }),
      dataIndex: ['owner', 'user', 'fullName'],
      key: 'owner',
      width: 150,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.vehicle.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      valueType: 'date',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.vehicle.actions' }),
      key: 'action',
      width: 130,
      search: false,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {intl.formatMessage({ id: 'pages.vehicle.edit' })}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {intl.formatMessage({ id: 'pages.vehicle.delete' })}
          </Button>
        </Space>
      ),
    },
  ];

  const filterFields: FilterFieldDefinition[] = [
    {
      key: 'type',
      label: intl.formatMessage({ id: 'pages.vehicle.type' }),
      type: 'select',
      options: Object.entries(vehicleTypeMap).map(([key, value]) => ({
        label: value,
        value: key,
      })),
    },
    {
      key: 'apartmentId',
      label: intl.formatMessage({ id: 'pages.vehicle.apartment' }),
      type: 'select',
      options: apartments.map(a => ({
        label: a.code,
        value: a.id,
      })),
    },
    {
      key: 'ownerId',
      label: intl.formatMessage({ id: 'pages.vehicle.owner' }),
      type: 'select',
      options: residents.map(r => ({
        label: r.user?.fullName || '',
        value: r.id,
      })),
    },
    {
      key: 'licensePlate',
      label: intl.formatMessage({ id: 'pages.vehicle.licensePlate' }),
      type: 'text',
    },
  ];

  return (
    <>
      <ProTable<VehicleItem>
        headerTitle={intl.formatMessage({ id: 'pages.vehicle.title' })}
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
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.vehicle.quickSearchPlaceholder' })}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={handleExternalSearch}
            style={{ width: 240 }}
            allowClear
          />,
          <Button key="filter" type="default" onClick={() => setFilterDrawerOpen(true)}>
            {intl.formatMessage({ id: 'components.advancedFilter.open' })}
          </Button>,
          <Button key="clearFilters" onClick={handleClearFilters}>
            {intl.formatMessage({ id: 'components.advancedFilter.clear' })}
          </Button>,
          <Button
            key="button"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            type="primary"
          >
            {intl.formatMessage({ id: 'pages.vehicle.addNew' })}
          </Button>,
        ]}
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
        title={editingRecord
          ? intl.formatMessage({ id: 'pages.vehicle.editTitle' })
          : intl.formatMessage({ id: 'pages.vehicle.addTitle' })}
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingRecord ? handleUpdate : handleCreate}
          onValuesChange={handleValuesChange}
        >
          <Form.Item
            name="type"
            label={intl.formatMessage({ id: 'pages.vehicle.type' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.vehicle.typeRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.vehicle.typePlaceholder' })}>
              {Object.entries(vehicleTypeMap).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="licensePlate"
            label={intl.formatMessage({ id: 'pages.vehicle.licensePlate' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.vehicle.licensePlatePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.vehicle.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.vehicle.apartmentRequired' }) }]}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'pages.vehicle.apartmentPlaceholder' })}
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
            label={intl.formatMessage({ id: 'pages.vehicle.owner' })}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'pages.vehicle.ownerPlaceholder' })}
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRecord ? intl.formatMessage({ id: 'pages.vehicle.edit' }) : intl.formatMessage({ id: 'pages.vehicle.addNew' })}
              </Button>
              <Button onClick={handleCancel}>{intl.formatMessage({ id: 'pages.common.cancel' })}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <AdvancedFilterDrawer
        visible={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterSubmit}
        onClear={handleClearFilters}
        fields={filterFields}
        quickSearchPlaceholder={intl.formatMessage({ id: 'pages.vehicle.quickSearchPlaceholder' })}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />
    </>
  );
};