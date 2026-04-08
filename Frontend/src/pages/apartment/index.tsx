import { useState, useRef, useEffect } from "react";
import { ProTable, ActionType, ProColumns } from "@ant-design/pro-components";
import { Button, Tag, Modal, Form, Input, InputNumber, Select, message, Table, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useIntl } from "@umijs/max";

import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from "@/components/AdvancedFilterDrawer";
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
    { key: 'salePrice', label: 'Giá bán', type: 'number' },
    { key: 'rentPrice', label: 'Giá thuê', type: 'number' },
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
      title: "STT",
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
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.floor' }),
      dataIndex: ["floor", "number"],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.type' }),
      dataIndex: ["type", "name"],
      search: false,
    },
    {
      title: "Giá bán",
      dataIndex: "salePrice",
      search: false,
      render: (_, record) =>
        record.salePrice != null
          ? `${record.salePrice.toLocaleString("vi-VN")} đ`
          : '-',
    },
    {
      title: "Giá thuê",
      dataIndex: "rentPrice",
      search: false,
      render: (_, record) =>
        record.rentPrice != null
          ? `${record.rentPrice.toLocaleString("vi-VN")} đ`
          : '-',
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.area' }),
      dataIndex: "area",
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.status' }),
      dataIndex: "status",
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.apartment.actions' }),
      valueType: "option",
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
        toolBarRender={() => [
          <Input.Search
            key="quickSearch"
            placeholder="Tìm ID hoặc mã căn"
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
            Bộ lọc nâng cao
          </Button>,
          <Button
            key="clearFilters"
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
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
            <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              <Table.Summary.Cell index={0} colSpan={5}>Tổng cộng</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                {totalSalePrice > 0 ? `${totalSalePrice.toLocaleString('vi-VN')} đ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                {totalRentPrice > 0 ? `${totalRentPrice.toLocaleString('vi-VN')} đ` : '-'}
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
        quickSearchPlaceholder="Tìm ID hoặc mã căn"
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

          <Form.Item name="salePrice" label="Giá bán">
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="Nhập giá bán"
            />
          </Form.Item>

          <Form.Item name="rentPrice" label="Giá thuê">
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="Nhập giá thuê"
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
