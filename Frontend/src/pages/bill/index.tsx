import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, DatePicker, InputNumber, message, Table, Space, Select, Radio, Card, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, FileTextOutlined, BankOutlined, CreditCardOutlined, WalletOutlined, CheckOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import qrBankImage from '@/assets/qr-bank.jpg';
import AdvancedFilterDrawer, {
  FilterFieldDefinition,
  FilterRowItem,
} from '@/components/AdvancedFilterDrawer';
import SortIcon, { SortDirection } from '@/components/SortIcon';
import { getBills, createBill, updateBill, deleteBill, BillItem } from '@/services/bill';
import { getApartments, ApartmentItem } from '@/services/apartment';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Component trang quản lý hóa đơn
 * Hiển thị danh sách hóa đơn, cho phép thêm/sửa/xóa hóa đơn (admin)
 * Cho phép thanh toán và xuất hóa đơn (cư dân)
 */
export default () => {
  // Hook để quản lý trạng thái component
  const access = useAccess(); // Hook để kiểm tra quyền truy cập
  const actionRef = useRef<ActionType>(null); // Ref cho ProTable để reload dữ liệu
  const billPreviewRef = useRef<HTMLDivElement>(null); // Ref cho preview hóa đơn khi xuất PDF

  // Các state quản lý modal và form
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal thêm/sửa hóa đơn
  const [editingRecord, setEditingRecord] = useState<BillItem | null>(null); // Hóa đơn đang chỉnh sửa
  const [form] = Form.useForm(); // Form cho thêm/sửa hóa đơn
  const [paymentModalOpen, setPaymentModalOpen] = useState(false); // Modal thanh toán
  const [paymentRecord, setPaymentRecord] = useState<BillItem | null>(null); // Hóa đơn đang thanh toán
  const [paymentForm] = Form.useForm(); // Form cho thanh toán
  const [exportModalOpen, setExportModalOpen] = useState(false); // Modal xuất hóa đơn
  const [exportRecord, setExportRecord] = useState<BillItem | null>(null); // Hóa đơn đang xuất

  // State quản lý dữ liệu và lọc
  const [allData, setAllData] = useState<BillItem[]>([]); // Tất cả dữ liệu hóa đơn
  const [apartments, setApartments] = useState<ApartmentItem[]>([]); // Danh sách căn hộ
  const [quickSearch, setQuickSearch] = useState<string>(''); // Tìm kiếm nhanh
  const [searchText, setSearchText] = useState<string>(''); // Text tìm kiếm
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]); // Các điều kiện lọc
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // Modal lọc nâng cao

  // State quản lý sắp xếp
  const [monthYearSort, setMonthYearSort] = useState<SortDirection>(null); // Sắp xếp theo tháng/năm
  const [electricityFeeSort, setElectricityFeeSort] = useState<SortDirection>(null); // Sắp xếp theo tiền điện
  const [waterFeeSort, setWaterFeeSort] = useState<SortDirection>(null); // Sắp xếp theo tiền nước
  const [serviceFeeSort, setServiceFeeSort] = useState<SortDirection>(null); // Sắp xếp theo phí dịch vụ
  const [totalAmountSort, setTotalAmountSort] = useState<SortDirection>(null); // Sắp xếp theo tổng tiền

  // Hàm tải danh sách căn hộ
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

  // Hàm xử lý thanh toán hóa đơn
  const handlePayment = (record: BillItem) => {
    setPaymentRecord(record);
    paymentForm.resetFields();
    setPaymentModalOpen(true);
  };

  // Hàm submit thanh toán
  const handlePaymentSubmit = async (values: any) => {
    if (!paymentRecord) return;

    try {
        if (values.paymentMethod === 'CASH') {
        await updateBill(paymentRecord.id, {
          paymentMethod: 'CASH',
          notes: values.notes
        });
        message.info('Thanh toán tiền mặt đã được ghi nhận. Đang chờ admin xác nhận.');
        setPaymentModalOpen(false);
        actionRef.current?.reload();
      } else if (values.paymentMethod === 'BANK_TRANSFER') {
        await updateBill(paymentRecord.id, {
          paymentMethod: 'BANK_TRANSFER',
          notes: values.notes
        });
        message.info('Chuyển khoản ngân hàng đã được ghi nhận.');
        setPaymentModalOpen(false);
        actionRef.current?.reload();
      }
    } catch (error) {
      message.error('Thanh toán thất bại');
    }
  };

  // Hàm xác nhận thanh toán (dành cho admin)
  const handleConfirmBill = async (record: BillItem) => {
    try {
      await updateBill(record.id, {
        status: 'PAID',
      });
      message.success('Xác nhận thanh toán thành công');
      actionRef.current?.reload();
    } catch (error) {
      message.error('Xác nhận thất bại');
    }
  };

  // Hàm xử lý xuất hóa đơn
  const handleExport = (record: BillItem) => {
    setExportRecord(record);
    setExportModalOpen(true);
  };

  // Hàm xác nhận xuất hóa đơn PDF
  const handleConfirmExport = async () => {
    if (!exportRecord || !billPreviewRef.current) return;
    try {
      // Chụp ảnh preview hóa đơn
      const canvas = await html2canvas(billPreviewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      // Tạo PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${exportRecord.id}.pdf`);
      message.success('Xuất hóa đơn thành công');
      setExportModalOpen(false);
    } catch (error) {
      message.error('Xuất hóa đơn thất bại');
    }
  };

  // Định nghĩa các cột của bảng hóa đơn
  const columns: ProColumns<BillItem>[] = [
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
      title: 'Căn hộ',
      dataIndex: ['apartment', 'code'],
      width: 100,
      search: false,
    },
    {
      title: (
        <Space>
          {'Tháng/Năm'}
          {/* Icon sắp xếp theo tháng/năm */}
          <SortIcon
            sortDirection={monthYearSort}
            onSort={(direction) => {
              setMonthYearSort(direction);
              // Reset các sắp xếp khác
              setElectricityFeeSort(null);
              setWaterFeeSort(null);
              setServiceFeeSort(null);
              setTotalAmountSort(null);
              actionRef.current?.reload();
            }}
          />
        </Space>
      ),
      dataIndex: 'month',
      width: 100,
      search: false,
      render: (_, record) => `${record.month}/${record.year}`,
    },
    {
      title: (
        <Space>
          {'Tiền điện (VND)'}
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
      // Cột hiển thị tiền điện và cho phép sắp xếp
      dataIndex: 'electricityFee',
      width: 130,
      search: false,
      render: (_, record) => record.electricityFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {'Tiền nước (VND)'}
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
      // Cột hiển thị tiền nước và cho phép sắp xếp
      dataIndex: 'waterFee',
      width: 130,
      search: false,
      render: (_, record) => record.waterFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {'Phí dịch vụ (VND)'}
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
      // Cột hiển thị phí dịch vụ và cho phép sắp xếp
      dataIndex: 'serviceFee',
      width: 130,
      search: false,
      render: (_, record) => record.serviceFee?.toLocaleString('vi-VN') + '',
    },
    {
      title: (
        <Space>
          {'Tổng tiền (VND)'}
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
      // Cột hiển thị tổng tiền và cho phép sắp xếp
      dataIndex: 'amount',
      width: 130,
      search: false,
      render: (_, record) => <strong>{record.amount?.toLocaleString('vi-VN')} </strong>,
    },
    {
      title: 'Hạn thanh toán',
      // Cột hiển thị ngày đến hạn
      dataIndex: 'dueDate',
      width: 110,
      valueType: 'date',
      search: false,
    },
    {
      title: 'Trạng thái',
      // Cột hiển thị trạng thái hóa đơn với tag màu sắc
      dataIndex: 'status',
      width: 120,
      valueEnum: {
        UNPAID: { text: 'Chưa thanh toán' },
        WAITING_CONFIRMATION: { text: 'Chờ xác nhận' },
        PAID: { text: 'Đã thanh toán' },
        UPCOMING_OVERDUE: { text: 'Sắp quá hạn' },
        OVERDUE: { text: 'Quá hạn' },
      },
      render: (_, record) => {
        if (record.status === 'PAID') {
          return <Tag color="green">{'Đã thanh toán'}</Tag>;
        } else if (record.status === 'WAITING_CONFIRMATION') {
          return <Tag color="orange">{'Chờ xác nhận'}</Tag>;
        } else if (record.status === 'OVERDUE') {
          return <Tag color="red">{'Quá hạn'}</Tag>;
        } else if (record.status === 'UPCOMING_OVERDUE') {
          return <Tag color="gold">{'Sắp quá hạn'}</Tag>;
        } else {
          return <Tag color="blue">{'Chưa thanh toán'}</Tag>;
        }
      },
    },
    {
      title: 'Thao tác',
      valueType: 'option',
      width: 130,
      render: (_, record) => {
        // Render các button hành động theo quyền và trạng thái hóa đơn
        console.log('Rendering actions for access.isResident:', access.isResident, 'record status:', record.status);
        if (access.isResident === true) {
            const canPayment = ['UNPAID', 'OVERDUE', 'UPCOMING_OVERDUE'].includes(record.status);
          const canExport = record.status === 'PAID';
          return [
            canPayment && (
              <Button
                key="payment"
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => handlePayment(record)}
              >
                {'Thanh toán'}
              </Button>
            ),
            canExport && (
              <Button
                key="export"
                type="default"
                icon={<FileTextOutlined />}
                onClick={() => handleExport(record)}
                style={{ backgroundColor: 'orange', borderColor: 'orange', color: 'white' }}
              >
                {'Xuất'}
              </Button>
            ),
          ];
        } else {
            const canEdit = record.status !== 'PAID';
          const canDelete = record.status !== 'PAID';
          const canExport = record.status === 'PAID';
          const canConfirm = record.status === 'WAITING_CONFIRMATION';
          return [
            canEdit && (
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {'Sửa'}
              </Button>
            ),
            canDelete && (
              <Button
                key="delete"
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              >
                {'Xóa'}
              </Button>
            ),
            canConfirm && (
              <Button
                key="confirm"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleConfirmBill(record)}
              >
                {'Xác nhận'}
              </Button>
            ),
            canExport && (
              <Button
                key="export"
                type="link"
                icon={<FileTextOutlined />}
                onClick={() => handleExport(record)}
                style={{ color: 'orange' }}
              >
                {'Xuất'}
              </Button>
            ),
          ];
        }
      },
    },
  ];

  // Hàm thêm hóa đơn mới
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ status: 'UNPAID' });
    setIsModalOpen(true);
  };

  // Hàm chỉnh sửa hóa đơn
  const handleEdit = (record: BillItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      monthYear: record.year && record.month ? dayjs(`${record.year}-${String(record.month).padStart(2, '0')}-01`) : null,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  // Hàm xử lý thay đổi giá trị form để tính tổng tiền tự động
  const handleValuesChange = () => {
    const electricity = form.getFieldValue('electricityFee') || 0;
    const water = form.getFieldValue('waterFee') || 0;
    const service = form.getFieldValue('serviceFee') || 0;
    const total = Number(electricity) + Number(water) + Number(service);
    form.setFieldValue('amount', total);
  };

  // Hàm xóa hóa đơn
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc muốn xóa hóa đơn này?',
      onOk: async () => {
        try {
          await deleteBill(id);
          message.success('Đã xóa thành công');
          actionRef.current?.reload();
        } catch (error) {
          message.error('Xóa thất bại');
        }
      },
    });
  };

  // Hàm submit form thêm/sửa hóa đơn
  const handleSubmit = async (values: any) => {
    try {
      const monthYear = values.monthYear;
      const data = {
        ...values,
        month: monthYear ? monthYear.month() + 1 : values.month,
        year: monthYear ? monthYear.year() : values.year,
        amount: values.amount ?? 0,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      delete data.monthYear;

      if (editingRecord) {
        await updateBill(editingRecord.id, data);
        message.success('Cập nhật thành công');
      } else {
        await createBill(data);
        message.success('Tạo mới thành công');
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error('Thao tác thất bại');
    }
  };

  // Định nghĩa các trường lọc nâng cao
  const filterFields: FilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'apartmentCode', label: 'Căn hộ', type: 'text' },
    { key: 'month', label: 'Tháng', type: 'number' },
    { key: 'year', label: 'Năm', type: 'number' },
    { key: 'electricityFee', label: 'Tiền điện (VND)', type: 'number' },
    { key: 'waterFee', label: 'Tiền nước (VND)', type: 'number' },
    { key: 'serviceFee', label: 'Phí dịch vụ (VND)', type: 'number' },
    { key: 'amount', label: 'Tổng tiền (VND)', type: 'number' },
    { key: 'dueDate', label: 'Hạn thanh toán', type: 'text' },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Đã thanh toán', value: 'PAID' },
        { label: 'Chưa thanh toán', value: 'UNPAID' },
        { label: 'Chờ xác nhận', value: 'WAITING_CONFIRMATION' },
        { label: 'Sắp quá hạn', value: 'UPCOMING_OVERDUE' },
        { label: 'Quá hạn', value: 'OVERDUE' },
      ],
    },
  ];

  // Hàm lấy giá trị của trường để lọc
  const getFieldValue = (item: BillItem, field: string) => {
    switch (field) {
      case 'apartmentCode':
        return item.apartment?.code;
      default:
        return (item as any)[field];
    }
  };

  // Hàm xử lý submit bộ lọc
  const handleFilterSubmit = (values: { quickSearch: string; filters: FilterRowItem[] }) => {
    setQuickSearch(values.quickSearch || '');
    setFilterRows(values.filters || []);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  // Hàm xóa tất cả bộ lọc
  const handleClearFilters = () => {
    setQuickSearch('');
    setSearchText('');
    setFilterRows([]);
    setFilterDrawerOpen(false);
    actionRef.current?.reload();
  };

  // Hàm xuất Excel
  const handleExportExcel = () => {
    const data = allData.map(item => ({
      ID: item.id,
      'Căn hộ': item.apartment?.code,
      'Tháng': item.month,
      'Năm': item.year,
      'Tiền điện': item.electricityFee,
      'Tiền nước': item.waterFee,
      'Phí dịch vụ': item.serviceFee,
      'Tổng tiền': item.amount,
      'Ngày đến hạn': item.dueDate,
      'Trạng thái': item.status === 'PAID' ? 'Đã thanh toán' : item.status === 'UNPAID' ? 'Chưa thanh toán' : item.status === 'WAITING_CONFIRMATION' ? 'Chờ xác nhận' : item.status === 'OVERDUE' ? 'Quá hạn' : 'Sắp quá hạn',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');
    XLSX.writeFile(wb, 'hoa_don.xlsx');
    message.success('Xuất Excel thành công');
  };

  // Hàm xử lý tìm kiếm nhanh
  const handleExternalSearch = (value: string) => {
    setQuickSearch(value);
    setSearchText(value);
    actionRef.current?.reload();
  };

  // Hàm áp dụng toán tử lọc
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

  // Hàm lọc dữ liệu
  const filterData = (data: BillItem[]) => {
    let filtered = [...data];

    // Lọc tìm kiếm nhanh
    if (quickSearch) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        (item.apartment?.code ?? '').toLowerCase().includes(term)
      );
    }

    // Lọc nâng cao
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
    if (monthYearSort) {
      filtered = [...filtered].sort((a, b) => {
        const aDate = a.year * 100 + a.month;
        const bDate = b.year * 100 + b.month;
        return monthYearSort === 'asc' ? aDate - bDate : bDate - aDate;
      });
    } else if (electricityFeeSort) {
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
      // Sắp xếp mặc định theo ID (tăng dần: HD001 -> HD002)
      filtered = [...filtered].sort((a, b) => a.id.localeCompare(b.id));
    }

    return filtered;
  };

  return (
    <>
      {/* Bảng chính hiển thị danh sách hóa đơn */}
      <ProTable<BillItem>
        headerTitle={'Quản lý hóa đơn'}
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
          // Ô tìm kiếm nhanh
          <Input.Search
            key="search"
            placeholder={'Tìm kiếm ID hoặc mã căn'}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={handleExternalSearch}
            style={{ width: 240 }}
            allowClear
          />,
          // Nút lọc nâng cao
          <Button key="filter" type="default" onClick={() => setFilterDrawerOpen(true)}>
            {'Bộ lọc nâng cao'}
          </Button>,
          // Nút xóa bộ lọc
          <Button key="clearFilters" type="default" style={{ color: '#fa8c16', borderColor: '#fa8c16' }} onClick={handleClearFilters}>
            {'Xóa bộ lọc'}
          </Button>,
          // Nút xuất Excel
          <Button
            key="exportExcel"
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
          >
            {'Xuất Excel'}
          </Button>,
          // Nút thêm hóa đơn mới (chỉ admin)
          ...(access.isResident ?[]: [ <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}> {'Thêm mới'} </Button>, ]),
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
          // Tính tổng các khoản phí
          const totalElectricityFee = allData.reduce((sum, item) => sum + (item.electricityFee || 0), 0);
          const totalWaterFee = allData.reduce((sum, item) => sum + (item.waterFee || 0), 0);
          const totalServiceFee = allData.reduce((sum, item) => sum + (item.serviceFee || 0), 0);
          const totalAmount = allData.reduce((sum, item) => sum + (item.amount || 0), 0);

          return (
            <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', position: 'sticky', bottom: 0, zIndex: 1 }}>
              <Table.Summary.Cell index={0} colSpan={4}>
              {'Tổng'}
            </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                {totalElectricityFee > 0 ? `${totalElectricityFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                {totalWaterFee > 0 ? `${totalWaterFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                {totalServiceFee > 0 ? `${totalServiceFee.toLocaleString('vi-VN')} ` : '-'}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7}>
                <strong>{totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')} ` : '-'}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} colSpan={3}></Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />

      {/* Drawer lọc nâng cao */}
      <AdvancedFilterDrawer
        visible={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterSubmit}
        onClear={handleClearFilters}
        fields={filterFields}
        quickSearchPlaceholder={'Tìm kiếm ID hoặc mã căn'}
        initialQuickSearch={quickSearch}
        initialFilters={filterRows}
      />

      {/* Modal xuất hóa đơn PDF */}
      <Modal
        title={'Xem trước hóa đơn'}
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalOpen(false)}>
            {'Hủy'}
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmExport}>
            {'Xác nhận xuất'}
          </Button>,
        ]}
        width={600}
        destroyOnClose
      >
        {exportRecord && (
          <div>
            {/* Preview hóa đơn */}
            <div
              ref={billPreviewRef}
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#000',
                backgroundColor: '#fff',
                padding: '20px',
                border: '1px solid #ddd',
                maxWidth: '500px',
                margin: '0 auto',
              }}
            >
              {/* Header hóa đơn */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>CHUNG CƯ DUCKLING</div>
                <div>Địa chỉ: 123 Cầu Giấy, Hà Nội</div>
                <div>Hotline: 0909 000 000</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '20px 0' }} />
              <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>
                HÓA ĐƠN THANH TOÁN
              </div>
              {/* Thông tin hóa đơn */}
              <div style={{ marginBottom: '10px' }}>
                <strong>Mã hóa đơn:</strong> {exportRecord.id}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Ngày phát hành:</strong> {dayjs(exportRecord.createdAt).format('DD/MM/YYYY')}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Thông tin căn hộ :</div>
                <div><strong>Căn hộ:</strong> {exportRecord.apartment?.code}</div>
                <div><strong>Tháng/Năm:</strong> {exportRecord.month}/{exportRecord.year}</div>
              </div>
              {/* Chi tiết thanh toán */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Chi tiết thanh toán :</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tiền điện:</span>
                  <span>{exportRecord.electricityFee?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tiền nước:</span>
                  <span>{exportRecord.waterFee?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phí dịch vụ:</span>
                  <span>{exportRecord.serviceFee?.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '20px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>
                <span>TỔNG TIỀN:</span>
                <span>{exportRecord.amount?.toLocaleString('vi-VN')} VND</span>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Trạng thái:</strong> {exportRecord.status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
              </div>
              {/* Thông tin thanh toán nếu đã thanh toán */}
              {exportRecord.status === 'PAID' && exportRecord.payments && exportRecord.payments.length > 0 && (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Ngày thanh toán:</strong> {dayjs(exportRecord.payments[0].createdAt).format('DD/MM/YYYY')}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Phương thức:</strong> {exportRecord.payments[0].method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản ngân hàng'}
                  </div>
                </>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '20px 0' }} />
              <div style={{ textAlign: 'center', fontStyle: 'italic' }}>
                Cảm ơn quý cư dân!
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#666', marginTop: '16px' }}>
              Nhấn "Xác nhận xuất" để tải xuống file PDF hóa đơn.
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm/sửa hóa đơn */}
      <Modal
        title={editingRecord ? 'Cập nhật hóa đơn' : 'Thêm hóa đơn mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleValuesChange}>
          {/* Chọn căn hộ */}
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
                label: `${item.code}`,
                value: item.id,
              }))}
            />
          </Form.Item>
          {/* Chọn tháng/năm */}
          <Form.Item
            name="monthYear"
            label={'Tháng/Năm'}
            rules={[{ required: true, message: 'Vui lòng chọn tháng và năm' }]}
          >
            <DatePicker
              picker="month"
              style={{ width: '100%' }}
              placeholder={'Chọn tháng/năm'}
              format="MM/YYYY"
            />
          </Form.Item>
          {/* Nhập tiền điện */}
          <Form.Item
            name="electricityFee"
            label={'Tiền điện (VND)'}
          >
            <InputNumber style={{ width: '100%' }} placeholder={'Nhập tiền điện'} />
          </Form.Item>
          {/* Nhập tiền nước */}
          <Form.Item
            name="waterFee"
            label={'Tiền nước (VND)'}
          >
            <InputNumber style={{ width: '100%' }} placeholder={'Nhập tiền nước'} />
          </Form.Item>
          {/* Nhập phí dịch vụ */}
          <Form.Item
            name="serviceFee"
            label={'Phí dịch vụ (VND)'}
          >
            <InputNumber style={{ width: '100%' }} placeholder={'Nhập phí dịch vụ'} />
          </Form.Item>
          {/* Hiển thị tổng tiền (tự động tính) */}
          <Form.Item
            name="amount"
            label={'Tổng tiền (VND)'}
          >
            <InputNumber style={{ width: '100%' }} disabled placeholder={'Tổng tiền'} />
          </Form.Item>
          {/* Chọn ngày đến hạn */}
          <Form.Item
            name="dueDate"
            label={'Hạn thanh toán'}
            rules={[{ required: true, message: 'Vui lòng chọn hạn thanh toán' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          {/* Chọn trạng thái */}
          <Form.Item
            name="status"
            label={'Trạng thái'}
            initialValue="UNPAID"
          >
            <Select
              placeholder={'Chọn trạng thái'}
              options={[
                { value: 'PAID', label: 'Đã thanh toán' },
                { value: 'UNPAID', label: 'Chưa thanh toán' },
                { value: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thanh toán */}
      <Modal
        title={'Thanh toán hóa đơn'}
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPaymentModalOpen(false)}>
            {'Hủy'}
          </Button>,
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const paymentMethod = getFieldValue('paymentMethod');

              if (paymentMethod === 'CASH') {
                return (
                  <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                    {'Xác nhận thanh toán'}
                  </Button>
                );
              } else if (paymentMethod === 'BANK_TRANSFER') {
                return (
                  <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                    {'Tôi đã chuyển khoản'}
                  </Button>
                );
              }
              return (
                <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                  {'Chọn phương thức'}
                </Button>
              );
            }}
          </Form.Item>
        ]}
        width={600}
        destroyOnClose
      >
        {paymentRecord && (
          <div>
            {/* Thông tin hóa đơn cần thanh toán */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{'Căn hộ'}:</strong></span>
                <span>{paymentRecord.apartment?.code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{'Tháng/Năm'}:</strong></span>
                <span>{paymentRecord.month}/{paymentRecord.year}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{'Tổng tiền'}:</strong></span>
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  {paymentRecord.amount?.toLocaleString('vi-VN')} VND
                </span>
              </div>
            </Card>

            <Divider />

            {/* Form thanh toán */}
            <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit}>
              {/* Chọn phương thức thanh toán */}
                <Form.Item
                name="paymentMethod"
                label={'Phương thức thanh toán'}
                rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="CASH">
                      <Space>
                        <DollarOutlined style={{ color: '#722ed1' }} />
                        {'Tiền mặt'}
                      </Space>
                    </Radio>
                    <Radio value="BANK_TRANSFER">
                      <Space>
                        <BankOutlined style={{ color: '#1890ff' }} />
                        {'Chuyển khoản ngân hàng'}
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {/* Hiển thị thông tin thanh toán theo phương thức */}
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.paymentMethod !== currentValues.paymentMethod}
              >
                {({ getFieldValue }) => {
                  const paymentMethod = getFieldValue('paymentMethod');
                  if (paymentMethod === 'BANK_TRANSFER') {
                    return (
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ marginBottom: 16 }}>
                          <strong>Quét mã QR để thanh toán</strong>
                        </div>
                        <div style={{
                          width: 200,
                          height: 200,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          borderRadius: 8
                        }}>
                          <img src={qrBankImage} alt="QR Code" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                          <div><strong>Thông tin chuyển khoản:</strong></div>
                          <div>Nội dung: {paymentRecord.id}</div>
                        </div>
                      </div>
                    );
                  }
                  if (paymentMethod === 'CASH') {
                    return (
                      <div style={{ padding: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                        <div style={{ textAlign: 'center', color: '#52c41a' }}>
                          <DollarOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                          <div><strong>Thanh toán bằng tiền mặt</strong></div>
                          <div>Hệ thống sẽ ghi nhận thanh toán và chuyển trạng thái chờ xác nhận từ admin</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              </Form.Item>

              {/* Nhập ghi chú */}
              <Form.Item
                name="notes"
                label={'Ghi chú'}
              >
                <Input.TextArea
                  placeholder={'Nhập ghi chú (tùy chọn)'}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </>
  );
};
