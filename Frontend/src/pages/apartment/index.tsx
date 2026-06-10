import { useState, useRef, useEffect } from "react";
import { ProTable, ActionType, ProColumns } from "@ant-design/pro-components";
import { Button, Tag, Modal, Form, Input, InputNumber, Select, message, Table, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";

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
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';
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

  // State dùng để lưu dữ liệu danh sách căn hộ, bộ lọc, và trạng thái modal

  // Hàm tải dữ liệu phụ trợ: danh sách tầng và loại căn hộ
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
    // Load dữ liệu phụ trợ 1 lần khi component mount
    loadMetaData();
  }, []);

  // Hàm trả về màu tag theo trạng thái căn hộ
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

  // Hàm chuyển trạng thái sang text đa ngôn ngữ
  const getStatusText = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return 'Trống';
      case "SOLD":
        return 'Đã bán';
      case "RENTED":
      case "OCCUPIED":
        return 'Cho thuê';
      case "MAINTENANCE":
        return 'Bảo trì';
      default:
        return status;
    }
  };

  // Định nghĩa các trường lọc cho drawer lọc nâng cao
  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'code', label: 'Mã căn', type: 'text' },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Trống', value: 'AVAILABLE' },
        { label: 'Đã bán', value: 'SOLD' },
        { label: 'Cho thuê', value: 'RENTED' },
        { label: 'Bảo trì', value: 'MAINTENANCE' },
      ],
    },
    { key: 'floorNumber', label: 'Tầng', type: 'number' },
    { key: 'typeName', label: 'Loại', type: 'text' },
    { key: 'residentName', label: 'Tên chủ hộ', type: 'text' },
    { key: 'salePrice', label: 'Giá bán (VND)', type: 'number' },
    { key: 'rentPrice', label: 'Giá thuê (VND)', type: 'number' },
    { key: 'area', label: 'Diện tích (m²)', type: 'number' },
  ];

  // Lấy giá trị cho bộ lọc theo trường mở rộng
  const getFieldValue = (item: ApartmentItem, field: string) => {
    switch (field) {
      case 'floorNumber':
        return item.floor?.number;
      case 'typeName':
        return item.type?.name;
      case 'residentName':
        return item.residents && item.residents.length > 0 ? item.residents[0].user.fullName : '';
      default:
        return (item as any)[field];
    }
  };

  // Định nghĩa các cột hiển thị trong bảng căn hộ
  const columns: ProColumns<ApartmentItem>[] = [
    {
      title: 'STT',
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
      title: 'Mã căn',
      dataIndex: "code",
      width: 80,
    },
    {
      title: 'Mã cư dân',
      dataIndex: ["residents", 0, "id"],
      width: 120,
      search: false,
      render: (_, record) =>
        record.residents && record.residents.length > 0
          ? record.residents[0].id
          : <span style={{ color: '#ccc' }}>
              {'Chưa có cư dân'}
            </span>,
    },
    {
      title: "Tên chủ hộ",
      dataIndex: ["residents", 0, "user", "fullName"],
      width: 120,
      search: false,
      render: (_, record) =>
        record.residents && record.residents.length > 0
          ? record.residents[0].user.fullName
          : <span style={{ color: '#ccc' }}>
              {'Chưa có cư dân'}
            </span>,
    },
    {
      title: 'Tầng',
      dataIndex: ["floor", "number"],
      width: 60,
      search: false,
    },
    {
      title: 'Loại',
      dataIndex: ["type", "name"],
      width: 90,
      search: false,
    },
    {
      title: (
        <Space>
          {'Giá bán (VND)'}
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
          {'Giá thuê (VND)'}
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
          {'Diện tích (m²)'}
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
      title: 'Trạng thái',
      dataIndex: "status",
      width: 90,
      // Hiển thị trạng thái căn hộ với tag màu
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
...(isResident
  ? []
  : [
      {
        title: 'Thao tác',
        valueType: 'option' as const,
        width: 180,
        // Các nút hành động chỉ dành cho người không phải cư dân
        render: (_: unknown, record: ApartmentItem) => [
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

  // Mở modal để tạo căn hộ mới
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Mở modal để chỉnh sửa căn hộ đã chọn
  const handleEdit = (record: ApartmentItem) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  // Xóa căn hộ sau khi xác nhận
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa?',
      content: 'Bạn có chắc muốn xóa căn hộ này?',
      onOk: async () => {
        try {
          await deleteApartment(id);
          message.success('Đã xóa thành công');
          actionRef.current?.reload();
        } catch {
          message.error('Xóa thất bại');
        }
      },
    });
  };

  // Xử lý submit form thêm/sửa căn hộ
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
        message.success('Cập nhật thành công');
      } else {
        await createApartment(data);
        message.success('Tạo mới thành công');
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  // Áp dụng toán tử lọc cho chức năng lọc nâng cao
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

  // Hàm lọc dữ liệu trước khi render lên bảng
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

    // Áp dụng sắp xếp
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
      {/* Bảng chính quản lý danh sách căn hộ */}
      <ProTable<ApartmentItem>
        headerTitle={'Quản lý căn hộ'}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 10,
        }}
        scroll={{ x: 'max-content', y: 'max-content' }}
        // Các nút công cụ trên thanh toolbar: tìm kiếm, mở bộ lọc, xóa bộ lọc, thêm mới
        toolBarRender={() => [
          <Input.Search
            key="quickSearch"
            placeholder={'Tìm ID hoặc mã căn'}
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
          ...(isResident ? [] : [
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              {'Thêm mới'}
            </Button>,
          ]),
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
              <Table.Summary.Cell index={0} colSpan={7}>
                {'Tổng'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                {totalSalePrice > 0 ? `${totalSalePrice.toLocaleString('vi-VN')}` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7}>
                {totalRentPrice > 0 ? `${totalRentPrice.toLocaleString('vi-VN')}` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8}>
                {totalArea > 0 ? `${totalArea.toLocaleString('vi-VN')} m²` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} colSpan={2}></Table.Summary.Cell>
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
        quickSearchPlaceholder={'Tìm ID hoặc mã căn'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      {/* Modal thêm / sửa căn hộ */}
      <Modal
        title={editingRecord ? 'Cập nhật căn hộ' : 'Thêm căn hộ mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="code"
            label={'Mã căn'}
            rules={[{ required: true }]}
          >
            <Input placeholder={'Nhập mã căn hộ'} />
          </Form.Item>

          <Form.Item
            name="floorId"
            label={'ID Tầng'}
            rules={[{ required: true }]}
          >
            <Select placeholder={'Nhập ID tầng'}>
              {floors.map((floor) => (
                <Select.Option key={floor.id} value={floor.id}>
                  {floor.number}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="typeId"
            label={'ID Loại'}
            rules={[{ required: true }]}
          >
            <Select placeholder={'Nhập ID loại'}>
              {apartmentTypes.map((type) => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="salePrice" label={'Giá bán (VND)'}>
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder={'Nhập giá bán'}
            />
          </Form.Item>

          <Form.Item name="rentPrice" label={'Giá thuê (VND)'}>
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder={'Nhập giá thuê'}
            />
          </Form.Item>      

          <Form.Item name="area" label={'Diện tích (m²)'}>
            <Input type="number" placeholder={'Nhập diện tích'} />
          </Form.Item>

          <Form.Item
            name="status"
            label={'Trạng thái'}
            rules={[{ required: true }]}
          >
            <Select placeholder={'Chọn trạng thái'}>
                <Option value="AVAILABLE">{'Trống'}</Option>
                <Option value="SOLD">{'Đã bán'}</Option>
                <Option value="RENTED">{'Cho thuê'}</Option>
                <Option value="MAINTENANCE">{'Bảo trì'}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
