import { useState, useRef, useEffect } from "react";
import { ProTable, ActionType, ProColumns } from "@ant-design/pro-components";
import { Button, Tag, Modal, Form, Input, InputNumber, Select, message, Table, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useIntl } from "@umijs/max";

import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from "@/components/AdvancedFilterDrawer";
import SortIcon, { SortDirection } from "@/components/SortIcon";
import {
  getApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  ApartmentItem,
} from "@/services/apartment";
import { getFloors, FloorItem } from "@/services/floor";
import { getApartmentTypes, ApartmentTypeItem } from "@/services/apartmentType";

const { Option } = Select;

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApartmentItem | null>(null);
  const [form] = Form.useForm();
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [apartmentTypes, setApartmentTypes] = useState<ApartmentTypeItem[]>([]);
  const [allData, setAllData] = useState<ApartmentItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [salePriceSort, setSalePriceSort] = useState<SortDirection>(null);
  const [rentPriceSort, setRentPriceSort] = useState<SortDirection>(null);
  const [areaSort, setAreaSort] = useState<SortDirection>(null);

  const loadMetaData = async () => {
    try {
      const [floorsData, typesData] = await Promise.all([
        getFloors(),
        getApartmentTypes(),
      ]);
      setFloors(floorsData);
      setApartmentTypes(typesData);
    } catch (error) {
      message.error("Failed to load floors and types");
    }
  };

  useEffect(() => {
    loadMetaData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "green";
      case "SOLD":
        return "orange";
      case "RENTED":
      case "OCCUPIED":
        return "blue";
      case "MAINTENANCE":
        return "red";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return intl.formatMessage({ id: 'pages.apartment.status.available' });
      case "SOLD":
        return intl.formatMessage({ id: 'pages.apartment.status.sold' });
      case "RENTED":
      case "OCCUPIED":
        return intl.formatMessage({ id: 'pages.apartment.status.rented' });
      case "MAINTENANCE":
        return intl.formatMessage({ id: 'pages.apartment.status.maintenance' });
      default:
        return status;
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'code', label: intl.formatMessage({ id: 'pages.apartment.code' }), type: 'text' },
    {
      key: 'status',
      label: intl.formatMessage({ id: 'pages.apartment.status' }),
      type: 'select',
      options: [
        { label: intl.formatMessage({ id: 'pages.apartment.status.available' }), value: 'AVAILABLE' },
        { label: intl.formatMessage({ id: 'pages.apartment.status.sold' }), value: 'SOLD' },
        { label: intl.formatMessage({ id: 'pages.apartment.status.rented' }), value: 'RENTED' },
        { label: intl.formatMessage({ id: 'pages.apartment.status.maintenance' }), value: 'MAINTENANCE' },
      ],
    },
    { key: 'floorNumber', label: intl.formatMessage({ id: 'pages.apartment.floor' }), type: 'number' },
    { key: 'typeName', label: intl.formatMessage({ id: 'pages.apartment.type' }), type: 'text' },
    { key: 'salePrice', label: intl.formatMessage({ id: 'pages.apartment.salePrice' }), type: 'number' },
    { key: 'rentPrice', label: intl.formatMessage({ id: 'pages.apartment.rentPrice' }), type: 'number' },
    { key: 'area', label: intl.formatMessage({ id: 'pages.apartment.area' }), type: 'number' },
  ];

  const getFieldValue = (item: ApartmentItem, field: string) => {
    switch (field) {
      case 'floorNumber':
        return item.floor?.number;
      case 'typeName':
        return item.type?.name;
      default:
        return (item as any)[field];
    }
  };

  const columns: ProColumns<ApartmentItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.common.index' }),
      dataIndex: "index",
      valueType: "index",
      width: 60,
      search: false,
    },
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.code' }),
      dataIndex: "code",
      width: 80,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.floor' }),
      dataIndex: ["floor", "number"],
      width: 60,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.type' }),
      dataIndex: ["type", "name"],
      width: 90,
      search: false,
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.apartment.salePrice' })}
          <SortIcon
            sortDirection={salePriceSort}
            onSort={(direction) => {
              setSalePriceSort(direction);
              setRentPriceSort(null);
              setAreaSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: "salePrice",
      width: 120,
      search: false,
      render: (_, record) =>
        record.salePrice != null
          ? `${record.salePrice.toLocaleString("vi-VN")}`
          : '-',
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.apartment.rentPrice' })}
          <SortIcon
            sortDirection={rentPriceSort}
            onSort={(direction) => {
              setRentPriceSort(direction);
              setSalePriceSort(null);
              setAreaSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: "rentPrice",
      width: 120,
      search: false,
      render: (_, record) =>
        record.rentPrice != null
          ? `${record.rentPrice.toLocaleString("vi-VN")} `
          : '-',
    },
    {
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.apartment.area' })}
          <SortIcon
            sortDirection={areaSort}
            onSort={(direction) => {
              setAreaSort(direction);
              setSalePriceSort(null);
              setRentPriceSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: "area",
      width: 120,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.status' }),
      dataIndex: "status",
      width: 90,
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.actions' }),
      valueType: "option",
      width: 120,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.apartment.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.apartment.delete' })}
        </Button>,
      ],
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ApartmentItem) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.apartment.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.apartment.deleteContent' }),
      onOk: async () => {
        try {
          await deleteApartment(id);
          message.success(intl.formatMessage({ id: 'pages.apartment.deleteSuccess' }));
          actionRef.current?.reload();
        } catch {
          message.error(intl.formatMessage({ id: 'pages.apartment.deleteError' }));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const data = { ...values };
      if (data.area !== undefined && data.area !== null && data.area !== "") {
        data.area = parseFloat(data.area);
      } else {
        delete data.area;
      }
      if (data.salePrice === undefined || data.salePrice === null) {
        delete data.salePrice;
      }
      if (data.rentPrice === undefined || data.rentPrice === null) {
        delete data.rentPrice;
      }
      if (editingRecord) {
        await updateApartment(editingRecord.id, data);
        message.success(intl.formatMessage({ id: 'pages.apartment.updateSuccess' }));
      } else {
        await createApartment(data);
        message.success(intl.formatMessage({ id: 'pages.apartment.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error(intl.formatMessage({ id: 'pages.apartment.actionError' }));
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

  const filterData = (data: ApartmentItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term)
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
    if (salePriceSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.salePrice || 0;
        const bValue = b.salePrice || 0;
        return salePriceSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else if (rentPriceSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.rentPrice || 0;
        const bValue = b.rentPrice || 0;
        return rentPriceSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else if (areaSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.area || 0;
        const bValue = b.area || 0;
        return areaSort === 'asc' ? aValue - bValue : bValue - aValue;
      });
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
      <ProTable<ApartmentItem>
        headerTitle={intl.formatMessage({ id: 'pages.apartment.title' })}
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
            placeholder={intl.formatMessage({ id: 'pages.apartment.quickSearchPlaceholder' })}
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
            {intl.formatMessage({ id: 'components.advancedFilter.open' })}
          </Button>,
          <Button
            key="clearFilters"
            onClick={handleClearFilters}
          >
            {intl.formatMessage({ id: 'components.advancedFilter.clear' })}
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {intl.formatMessage({ id: 'pages.apartment.addNew' })}
          </Button>,
        ]}
        request={async () => {
          const data = await getApartments();
          const filteredData = filterData(data);
          setAllData(filteredData);
          return {
            data: filteredData,
            success: true,
          };
        }}
        columns={columns}
        summary={() => {
          const totalArea = allData.reduce((sum, item) => sum + (item.area || 0), 0);
          const totalSalePrice = allData.reduce((sum, item) => sum + (item.salePrice || 0), 0);
          const totalRentPrice = allData.reduce((sum, item) => sum + (item.rentPrice || 0), 0);

          return (
            <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', position: 'sticky', bottom: 0, zIndex: 1 }}>
              <Table.Summary.Cell index={0} colSpan={5}>
                {intl.formatMessage({ id: 'pages.common.total' })}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                {totalSalePrice > 0 ? `${totalSalePrice.toLocaleString('vi-VN')}` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                {totalRentPrice > 0 ? `${totalRentPrice.toLocaleString('vi-VN')}` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                {totalArea > 0 ? `${totalArea.toLocaleString('vi-VN')} m²` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={2}></Table.Summary.Cell>
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
        quickSearchPlaceholder={intl.formatMessage({ id: 'pages.apartment.quickSearchPlaceholder' })}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord
          ? intl.formatMessage({ id: 'pages.apartment.editTitle' })
          : intl.formatMessage({ id: 'pages.apartment.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="code"
            label={intl.formatMessage({ id: 'pages.apartment.code' })}
            rules={[{ required: true }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.apartment.codePlaceholder' })} />
          </Form.Item>

          <Form.Item
            name="floorId"
            label={intl.formatMessage({ id: 'pages.apartment.floorId' })}
            rules={[{ required: true }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.apartment.floorIdPlaceholder' })}>
              {floors.map((floor) => (
                <Select.Option key={floor.id} value={floor.id}>
                  {floor.number}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="typeId"
            label={intl.formatMessage({ id: 'pages.apartment.typeId' })}
            rules={[{ required: true }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.apartment.typeIdPlaceholder' })}>
              {apartmentTypes.map((type) => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="salePrice" label={intl.formatMessage({ id: 'pages.apartment.salePrice' })}>
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder={intl.formatMessage({ id: 'pages.apartment.salePricePlaceholder' })}
            />
          </Form.Item>

          <Form.Item name="rentPrice" label={intl.formatMessage({ id: 'pages.apartment.rentPrice' })}>
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder={intl.formatMessage({ id: 'pages.apartment.rentPricePlaceholder' })}
            />
          </Form.Item>      

          <Form.Item name="area" label={intl.formatMessage({ id: 'pages.apartment.area' })}>
            <Input type="number" placeholder={intl.formatMessage({ id: 'pages.apartment.areaPlaceholder' })} />
          </Form.Item>

          <Form.Item
            name="status"
            label={intl.formatMessage({ id: 'pages.apartment.status' })}
            rules={[{ required: true }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.apartment.statusPlaceholder' })}>
                <Option value="AVAILABLE">
                {intl.formatMessage({ id: 'pages.apartment.status.available' })}
              </Option>
              <Option value="SOLD">
                {intl.formatMessage({ id: 'pages.apartment.status.sold' })}
              </Option>
              <Option value="RENTED">
                {intl.formatMessage({ id: 'pages.apartment.status.rented' })}
              </Option>
              <Option value="MAINTENANCE">
                {intl.formatMessage({ id: 'pages.apartment.status.maintenance' })}
              </Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
