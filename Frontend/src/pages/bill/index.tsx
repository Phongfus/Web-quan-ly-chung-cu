import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, DatePicker, InputNumber, message, Table, Space, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import SortIcon, { SortDirection } from '@/components/SortIcon';
import { getBills, createBill, updateBill, deleteBill, BillItem } from '@/services/bill';
import { getApartments, ApartmentItem } from '@/services/apartment';
import dayjs from 'dayjs';

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillItem | null>(null);
  const [form] = Form.useForm();
  const [allData, setAllData] = useState<BillItem[]>([]);
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [electricityFeeSort, setElectricityFeeSort] = useState<SortDirection>(null);
  const [waterFeeSort, setWaterFeeSort] = useState<SortDirection>(null);
  const [serviceFeeSort, setServiceFeeSort] = useState<SortDirection>(null);
  const [totalAmountSort, setTotalAmountSort] = useState<SortDirection>(null);

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

  const columns: ProColumns<BillItem>[] = [
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
      width: 80,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.apartment' }),
      dataIndex: ['apartment', 'code'],
      width: 100,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.monthYear' }),
      dataIndex: 'month',
      width: 100,
      search: false,
      render: (_, record) => `${record.month}/${record.year}`,
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.bill.electricityFee' })}
          <SortIcon
            sortDirection={electricityFeeSort}
            onSort={(direction) => {
              setElectricityFeeSort(direction);
              setWaterFeeSort(null);
              setServiceFeeSort(null);
              setTotalAmountSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'electricityFee',
      width: 130,
      search: false,
      render: (_, record) => record.electricityFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.bill.waterFee' })}
          <SortIcon
            sortDirection={waterFeeSort}
            onSort={(direction) => {
              setWaterFeeSort(direction);
              setElectricityFeeSort(null);
              setServiceFeeSort(null);
              setTotalAmountSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'waterFee',
      width: 130,
      search: false,
      render: (_, record) => record.waterFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.bill.serviceFee' })}
          <SortIcon
            sortDirection={serviceFeeSort}
            onSort={(direction) => {
              setServiceFeeSort(direction);
              setElectricityFeeSort(null);
              setWaterFeeSort(null);
              setTotalAmountSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'serviceFee',
      width: 130,
      search: false,
      render: (_, record) => record.serviceFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.bill.totalAmount' })}
          <SortIcon
            sortDirection={totalAmountSort}
            onSort={(direction) => {
              setTotalAmountSort(direction);
              setElectricityFeeSort(null);
              setWaterFeeSort(null);
              setServiceFeeSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'amount',
      width: 130,
      search: false,
      render: (_, record) => <strong>{record.amount?.toLocaleString('vi-VN')} </strong>,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.dueDate' }),
      dataIndex: 'dueDate',
      width: 110,
      valueType: 'date',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.status' }),
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        UNPAID: { text: intl.formatMessage({ id: 'pages.bill.status.unpaid' }) },
        PAID: { text: intl.formatMessage({ id: 'pages.bill.status.paid' }) },
      },
      render: (_, record) =>
        record.status === 'PAID' ? (
          <Tag color="green">{intl.formatMessage({ id: 'pages.bill.status.paid' })}</Tag>
        ) : (
          <Tag color="red">{intl.formatMessage({ id: 'pages.bill.status.unpaid' })}</Tag>
        ),
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.actions' }),
      valueType: 'option',
      width: 130,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.bill.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.bill.delete' })}
        </Button>,
      ],
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: BillItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
    setIsModalOpen(true);
  };

  const handleValuesChange = () => {
    const electricity = form.getFieldValue('electricityFee') || 0;
    const water = form.getFieldValue('waterFee') || 0;
    const service = form.getFieldValue('serviceFee') || 0;
    const total = Number(electricity) + Number(water) + Number(service);
    form.setFieldValue('amount', total);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.bill.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.bill.deleteContent' }),
      onOk: async () => {
        try {
          await deleteBill(id);
          message.success(intl.formatMessage({ id: 'pages.bill.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.bill.deleteError' }));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        amount: values.amount ?? 0,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      if (editingRecord) {
        await updateBill(editingRecord.id, data);
        message.success(intl.formatMessage({ id: 'pages.bill.updateSuccess' }));
      } else {
        await createBill(data);
        message.success(intl.formatMessage({ id: 'pages.bill.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.bill.actionError' }));
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'apartmentCode', label: intl.formatMessage({ id: 'pages.bill.apartment' }), type: 'text' },
    { key: 'month', label: intl.formatMessage({ id: 'pages.bill.month' }), type: 'number' },
    { key: 'year', label: intl.formatMessage({ id: 'pages.bill.year' }), type: 'number' },
    { key: 'electricityFee', label: intl.formatMessage({ id: 'pages.bill.electricityFee' }), type: 'number' },
    { key: 'waterFee', label: intl.formatMessage({ id: 'pages.bill.waterFee' }), type: 'number' },
    { key: 'serviceFee', label: intl.formatMessage({ id: 'pages.bill.serviceFee' }), type: 'number' },
    { key: 'amount', label: intl.formatMessage({ id: 'pages.bill.totalAmount' }), type: 'number' },
    { key: 'dueDate', label: intl.formatMessage({ id: 'pages.bill.dueDate' }), type: 'text' },
    {
      key: 'status',
      label: intl.formatMessage({ id: 'pages.bill.status' }),
      type: 'select',
      options: [
        { label: intl.formatMessage({ id: 'pages.bill.status.paid' }), value: 'PAID' },
        { label: intl.formatMessage({ id: 'pages.bill.status.unpaid' }), value: 'UNPAID' },
      ],
    },
  ];

  const getFieldValue = (item: BillItem, field: string) => {
    switch (field) {
      case 'apartmentCode':
        return item.apartment?.code;
      default:
        return (item as any)[field];
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

  const filterData = (data: BillItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.apartment?.code ?? '').toLowerCase().includes(term)
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

    // Apply sorting
    if (electricityFeeSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.electricityFee || 0;
        const bValue = b.electricityFee || 0;
        return electricityFeeSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else if (waterFeeSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.waterFee || 0;
        const bValue = b.waterFee || 0;
        return waterFeeSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else if (serviceFeeSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.serviceFee || 0;
        const bValue = b.serviceFee || 0;
        return serviceFeeSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else if (totalAmountSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.amount || 0;
        const bValue = b.amount || 0;
        return totalAmountSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else {
      // Default sort by ID (ascending: HD001 -> HD002)
      filtered = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    }

    return filtered;
  };

  return (
    <>
      <ProTable<BillItem>
        headerTitle={intl.formatMessage({ id: 'pages.bill.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
        scroll={{ x: 'max-content', y: 'max-content'}}
        toolBarRender={() => [
          <Input.Search
            key="search"
            placeholder={intl.formatMessage({ id: 'pages.bill.quickSearchPlaceholder' })}
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
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}> 
            {intl.formatMessage({ id: 'pages.bill.addNew' })}
          </Button>,
        ]}
        request={async () => {
          const data = await getBills();
          const filteredData = filterData(data);
          setAllData(filteredData);
          return {
            data: filteredData,
            success: true,
          };
        }}
        columns={columns}
        summary={() => {
          const totalElectricityFee = allData.reduce((sum, item) => sum + (item.electricityFee || 0), 0);
          const totalWaterFee = allData.reduce((sum, item) => sum + (item.waterFee || 0), 0);
          const totalServiceFee = allData.reduce((sum, item) => sum + (item.serviceFee || 0), 0);
          const totalAmount = allData.reduce((sum, item) => sum + (item.amount || 0), 0);

          return (
            <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', position: 'sticky', bottom: 0, zIndex: 1 }}>
              <Table.Summary.Cell index={0} colSpan={4}>
              {intl.formatMessage({ id: 'pages.common.total' })}
            </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                {totalElectricityFee > 0 ? `${totalElectricityFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                {totalWaterFee > 0 ? `${totalWaterFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                {totalServiceFee > 0 ? `${totalServiceFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <strong>{totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')} ` : '-'}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} colSpan={3}></Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />

      <AdvancedFilterDrawer
        visible={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterSubmit}
        onClear={handleClearFilters}
        fields={filterFields}
        quickSearchPlaceholder={intl.formatMessage({ id: 'pages.bill.quickSearchPlaceholder' })}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord 
          ? intl.formatMessage({ id: 'pages.bill.editTitle' }) 
          : intl.formatMessage({ id: 'pages.bill.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleValuesChange}>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.bill.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.apartmentRequired' }) }]}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'pages.bill.apartmentPlaceholder' })}
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
            name="month"
            label={intl.formatMessage({ id: 'pages.bill.month' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.monthRequired' }) }]}
          >
            <InputNumber min={1} max={12} style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.monthPlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="year"
            label={intl.formatMessage({ id: 'pages.bill.year' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.yearRequired' }) }]}
          >
            <InputNumber min={2000} max={2100} style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.yearPlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="electricityFee"
            label={intl.formatMessage({ id: 'pages.bill.electricityFee' })}
          >
            <InputNumber style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.electricityFeePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="waterFee"
            label={intl.formatMessage({ id: 'pages.bill.waterFee' })}
          >
            <InputNumber style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.waterFeePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="serviceFee"
            label={intl.formatMessage({ id: 'pages.bill.serviceFee' })}
          >
            <InputNumber style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.serviceFeePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="amount"
            label={intl.formatMessage({ id: 'pages.bill.totalAmount' })}
          >
            <InputNumber style={{ width: '100%' }} disabled placeholder={intl.formatMessage({ id: 'pages.bill.amountPlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label={intl.formatMessage({ id: 'pages.bill.dueDate' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.dueDateRequired' }) }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          {editingRecord && (
            <Form.Item
              name="status"
              label={intl.formatMessage({ id: 'pages.bill.status' })}
            >
              <Select
                placeholder={intl.formatMessage({ id: 'pages.bill.statusPlaceholder' })}
                options={[
                  {
                    value: 'PAID',
                    label: intl.formatMessage({ id: 'pages.bill.status.paid' }),
                  },
                  {
                    value: 'UNPAID',
                    label: intl.formatMessage({ id: 'pages.bill.status.unpaid' }),
                  },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
