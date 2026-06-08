import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import { getComplaints, createComplaint, updateComplaint, deleteComplaint, ComplaintItem } from '@/services/complaint';
import { getApartments, ApartmentItem } from '@/services/apartment';
import { getCurrentResident, ResidentItem } from '@/services/resident';

const { Option } = Select;
const { TextArea } = Input;

export default () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';
  const isAdmin = currentUser?.role === 'ADMIN';
  const complaintStatusSequence = ['PENDING', 'RESOLVED'] as const;
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ComplaintItem | null>(null);
  const [form] = Form.useForm();
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [currentResident, setCurrentResident] = useState<ResidentItem | null>(null);
  const [allData, setAllData] = useState<ComplaintItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const loadApartments = async () => {
    try {
      if (isResident) {
        const residentData = await getCurrentResident();
        setCurrentResident(residentData);
        setApartments([
          {
            ...residentData.apartment,
            createdAt: new Date().toISOString(),
            status: residentData.apartment.status as ApartmentItem['status'],
          },
        ]);
        form.setFieldsValue({ apartmentId: residentData.apartmentId });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "orange";
      case "RESOLVED":
        return "green";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return 'Chờ xử lý';
      case "RESOLVED":
        return 'Đã giải quyết';
      default:
        return status;
    }
  };

  const getNextComplaintStatus = (status: ComplaintItem['status']) => {
    const index = complaintStatusSequence.indexOf(status);
    if (index === -1) return status;
    return complaintStatusSequence[(index + 1) % complaintStatusSequence.length];
  };

  const handleStatusClick = async (record: ComplaintItem) => {
    if (!isAdmin) return;
    const nextStatus = getNextComplaintStatus(record.status);
    if (nextStatus === record.status) return;

    try {
      await updateComplaint(record.id, { status: nextStatus });
      message.success('Cập nhật trạng thái thành công');
      actionRef.current?.reload();
    } catch (error) {
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  const columns: ProColumns<ComplaintItem>[] = [
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
      title: 'Tiêu đề',
      dataIndex: 'title',
      width: 200,
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      width: 300,
      search: false,
      ellipsis: true,
    },
    {
      title: 'Người khiếu nại',
      dataIndex: ['user', 'fullName'],
      width: 150,
      search: false,
    },
    {
      title: 'Căn hộ',
      dataIndex: ['apartment', 'code'],
      width: 100,
      search: false,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <Tag
          color={getStatusColor(record.status)}
          style={{ cursor: isAdmin ? 'pointer' : 'default' }}
          onClick={() => isAdmin && handleStatusClick(record)}
        >
          {getStatusText(record.status)}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 150,
      search: false,
    },
    ...(isResident
      ? []
      : [
          {
            title: 'Hành động',
            valueType: 'option' as const,
            width: 120,
            render: (_: unknown, record: ComplaintItem) => [
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

  const handleAdd = async () => {
    setEditingRecord(null);
    form.resetFields();

    if (isResident) {
      if (!currentResident) {
        try {
          const residentData = await getCurrentResident();
          setCurrentResident(residentData);
          setApartments([
            {
              ...residentData.apartment,
              createdAt: new Date().toISOString(),
              status: residentData.apartment.status as ApartmentItem['status'],
            },
          ]);
          form.setFieldsValue({ apartmentId: residentData.apartmentId });
        } catch (error) {
          message.error('Không thể tải thông tin cư dân');
          return;
        }
      } else {
        form.setFieldsValue({ apartmentId: currentResident.apartmentId });
      }
    }

    setIsModalOpen(true);
  };

  const handleEdit = (record: ComplaintItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      apartmentId: record.apartmentId,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc muốn xóa khiếu nại này?',
      onOk: async () => {
        try {
          await deleteComplaint(id);
          message.success('Đã xóa thành công');
          actionRef.current?.reload();
        } catch (error) {
          message.error('Xóa thất bại');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        await updateComplaint(editingRecord.id, values);
        message.success('Cập nhật thành công');
      } else {
        await createComplaint(values);
        message.success('Tạo khiếu nại thành công');
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra';
      message.error(errorMsg);
    }
  };

  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'title', label: 'Tiêu đề', type: 'text' },
    { key: 'content', label: 'Nội dung', type: 'text' },
    { key: 'apartmentCode', label: 'Căn hộ', type: 'text' },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Chờ xử lý', value: 'PENDING' },
        { label: 'Đã giải quyết', value: 'RESOLVED' },
      ],
    },
  ];

  const getFieldValue = (item: ComplaintItem, field: string) => {
    switch (field) {
      case 'apartmentCode':
        return item.apartment?.code;
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

  const filterData = (data: ComplaintItem[]) => {
    let filtered = [...data];

    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.id.toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.user?.fullName?.toLowerCase().includes(term) ||
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

    // Sắp xếp theo ngày tạo giảm dần
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      <ProTable<ComplaintItem>
        headerTitle={'Quản lý khiếu nại'}
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
            placeholder={'Tìm kiếm ID, tiêu đề, nội dung...'}
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
            {'Thêm khiếu nại'}
          </Button>,
        ]}
        request={async () => {
          const data = await getComplaints();
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
        quickSearchPlaceholder={'Tìm kiếm ID, tiêu đề, nội dung...'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      <Modal
        title={editingRecord ? 'Sửa khiếu nại' : 'Thêm khiếu nại'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label={'Tiêu đề'}
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder={'Nhập tiêu đề khiếu nại'} />
          </Form.Item>
          <Form.Item
            name="content"
            label={'Nội dung'}
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <TextArea
              placeholder={'Nhập nội dung khiếu nại'}
              rows={4}
            />
          </Form.Item>
          {!isResident && (
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
                options={apartments.map((item) => ({
                  label: item.code,
                  value: item.id,
                }))}
              />
            </Form.Item>
          )}
          {isResident && currentResident && (
            <Form.Item name="apartmentId" hidden>
              <Input type="hidden" />
            </Form.Item>
          )}
          {editingRecord && (
            <Form.Item
              name="status"
              label={'Trạng thái'}
            >
              <Select placeholder={'Chọn trạng thái'}>
                <Option value="PENDING">{'Chờ xử lý'}</Option>
                <Option value="RESOLVED">{'Đã giải quyết'}</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};