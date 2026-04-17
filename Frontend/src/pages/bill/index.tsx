import { useState, useRef, useEffect } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, DatePicker, InputNumber, message, Table, Space, Select, Radio, Card, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, FileTextOutlined, BankOutlined, CreditCardOutlined, WalletOutlined } from '@ant-design/icons';
import { useIntl, useAccess } from '@umijs/max';
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

export default () => {
  const intl = useIntl();
  const access = useAccess();
  const actionRef = useRef<ActionType>(null);
  const billPreviewRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillItem | null>(null);
  const [form] = Form.useForm();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<BillItem | null>(null);
  const [paymentForm] = Form.useForm();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportRecord, setExportRecord] = useState<BillItem | null>(null);
  const [allData, setAllData] = useState<BillItem[]>([]);
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [filterRows, setFilterRows] = useState<FilterRowItem[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [monthYearSort, setMonthYearSort] = useState<SortDirection>(null);
  const [electricityFeeSort, setElectricityFeeSort] = useState<SortDirection>(null);
  const [waterFeeSort, setWaterFeeSort] = useState<SortDirection>(null);
  const [serviceFeeSort, setServiceFeeSort] = useState<SortDirection>(null);
  const [totalAmountSort, setTotalAmountSort] = useState<SortDirection>(null);

  const loadApartments = async () => {
    try {
      const data = await getApartments();
      setApartments(data);
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.bill.loadApartmentsError' }));
    }
  };
  useEffect(() => {
    loadApartments();
  }, []);

  const handlePayment = (record: BillItem) => {
    setPaymentRecord(record);
    paymentForm.resetFields();
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (values: any) => {
    if (!paymentRecord) return;

    try {
      if (values.paymentMethod === 'CASH') {
        await updateBill(paymentRecord.id, {
          paymentMethod: 'CASH',
          notes: values.notes
        });
        message.success(intl.formatMessage({ id: 'pages.bill.paymentSuccess' }) || 'Thanh toán thành công');
        setPaymentModalOpen(false);
        actionRef.current?.reload();
      } else if (values.paymentMethod === 'BANK_TRANSFER') {
          await updateBill(paymentRecord.id, {
            paymentMethod: 'BANK_TRANSFER',
            notes: values.notes
          });
        message.info(intl.formatMessage({ id: 'pages.bill.bankTransferMessage' }));
        setPaymentModalOpen(false);
        actionRef.current?.reload();
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.bill.paymentError' }) || 'Thanh toán thất bại');
    }
  };

  const handleExport = (record: BillItem) => {
    setExportRecord(record);
    setExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    if (!exportRecord || !billPreviewRef.current) return;
    try {
      const canvas = await html2canvas(billPreviewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
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
      message.success(intl.formatMessage({ id: 'pages.bill.exportSuccess' }) || 'Xuất hóa đơn thành công');
      setExportModalOpen(false);
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.bill.exportError' }) || 'Xuất hóa đơn thất bại');
    }
  };

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
      title: (
        <Space>
          {intl.formatMessage({ id: 'pages.bill.monthYear' })}
          <SortIcon
            sortDirection={monthYearSort}
            onSort={(direction) => {
              setMonthYearSort(direction);
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
        UPCOMING_OVERDUE: { text: intl.formatMessage({ id: 'pages.bill.status.upcomingOverdue' })},
        OVERDUE: { text: intl.formatMessage({ id: 'pages.bill.status.overdue' })},
      },
      render: (_, record) => {
        if (record.status === 'PAID') {
          return <Tag color="green">{intl.formatMessage({ id: 'pages.bill.status.paid' })}</Tag>;
        } else if (record.status === 'OVERDUE') {
          return <Tag color="red">{intl.formatMessage({ id: 'pages.bill.status.overdue' })}</Tag>;
        } else if (record.status === 'UPCOMING_OVERDUE') {
          return <Tag color="gold">{intl.formatMessage({ id: 'pages.bill.status.upcomingOverdue' })}</Tag>;
        } else {
          return <Tag color="blue">{intl.formatMessage({ id: 'pages.bill.status.unpaid' })}</Tag>;
        }
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.actions' }),
      valueType: 'option',
      width: 130,
      render: (_, record) => {
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
                {intl.formatMessage({ id: 'pages.bill.payment' }) || 'Thanh toán'}
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
                {intl.formatMessage({ id: 'pages.bill.export' }) || 'Xuất'}
              </Button>
            ),
          ];
        } else {
          const canEdit = record.status !== 'PAID';
          const canDelete = record.status !== 'PAID';
          const canExport = record.status === 'PAID';
          return [
            canEdit && (
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {intl.formatMessage({ id: 'pages.bill.edit' })}
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
                {intl.formatMessage({ id: 'pages.bill.delete' })}
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
                {intl.formatMessage({ id: 'pages.bill.export' }) || 'Xuất'}
              </Button>
            ),
          ];
        }
      },
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ status: 'UNPAID' });
    setIsModalOpen(true);
  };

  const handleEdit = (record: BillItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
      status: record.status,
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
        {label: intl.formatMessage({id: 'pages.bill.status.upcomingOverdue'}),value: 'UPCOMING_OVERDUE'},
        {label: intl.formatMessage({id: 'pages.bill.status.overdue'}),value: 'OVERDUE'},
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
          ...(access.isResident
            ? []
            : [
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  {intl.formatMessage({ id: 'pages.bill.addNew' })}
                </Button>,
              ]),
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
        title={intl.formatMessage({ id: 'pages.bill.exportModalTitle' }) || 'Xem trước hóa đơn'}
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalOpen(false)}>
            {intl.formatMessage({ id: 'pages.common.cancel' }) || 'Hủy'}
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmExport}>
            {intl.formatMessage({ id: 'pages.bill.confirmExport' }) || 'Xác nhận xuất'}
          </Button>,
        ]}
        width={600}
        destroyOnClose
      >
        {exportRecord && (
          <div>
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
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>CHUNG CƯ DUCKLING</div>
                <div>Địa chỉ: 123 Cầu Giấy, Hà Nội</div>
                <div>Hotline: 0909 000 000</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '20px 0' }} />
              <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>
                HÓA ĐƠN THANH TOÁN
              </div>
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
                label: `${item.code}`,
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
          <Form.Item
            name="status"
            label={intl.formatMessage({ id: 'pages.bill.status' })}
            initialValue="UNPAID"
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
        </Form>
      </Modal>

      <Modal
        title={intl.formatMessage({ id: 'pages.bill.paymentModalTitle' }) || 'Thanh toán hóa đơn'}
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPaymentModalOpen(false)}>
            {intl.formatMessage({ id: 'pages.common.cancel' }) || 'Hủy'}
          </Button>,
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const paymentMethod = getFieldValue('paymentMethod');

              if (paymentMethod === 'CASH') {
                return (
                  <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                    {intl.formatMessage({ id: 'pages.bill.confirmPayment' }) || 'Xác nhận thanh toán'}
                  </Button>
                );
              } else if (paymentMethod === 'BANK_TRANSFER') {
                return (
                  <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                    {intl.formatMessage({ id: 'pages.bill.iHaveTransferred' }) || 'Tôi đã chuyển khoản'}
                  </Button>
                );
              }
              return (
                <Button key="submit" type="primary" onClick={() => paymentForm.submit()}>
                  {intl.formatMessage({ id: 'pages.bill.selectPaymentMethod' }) || 'Chọn phương thức'}
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
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{intl.formatMessage({ id: 'pages.bill.apartment' })}:</strong></span>
                <span>{paymentRecord.apartment?.code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{intl.formatMessage({ id: 'pages.bill.monthYear' })}:</strong></span>
                <span>{paymentRecord.month}/{paymentRecord.year}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{intl.formatMessage({ id: 'pages.bill.totalAmount' })}:</strong></span>
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  {paymentRecord.amount?.toLocaleString('vi-VN')} VND
                </span>
              </div>
            </Card>

            <Divider />

            <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit}>
              <Form.Item
                name="paymentMethod"
                label={intl.formatMessage({ id: 'pages.bill.paymentMethod' }) || 'Phương thức thanh toán'}
                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.paymentMethodRequired' }) || 'Vui lòng chọn phương thức thanh toán' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="CASH">
                      <Space>
                        <DollarOutlined style={{ color: '#722ed1' }} />
                        {intl.formatMessage({ id: 'pages.bill.paymentMethod.cash' }) || 'Tiền mặt'}
                      </Space>
                    </Radio>
                    <Radio value="BANK_TRANSFER">
                      <Space>
                        <BankOutlined style={{ color: '#1890ff' }} />
                        {intl.formatMessage({ id: 'pages.bill.paymentMethod.bankTransfer' }) || 'Chuyển khoản ngân hàng'}
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

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
                          backgroundColor: '#f0f0f0',
                          border: '2px dashed #d9d9d9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          borderRadius: 8
                        }}>
                          <div style={{ textAlign: 'center', color: '#666' }}>
                            <BankOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                            <div>QR Code</div>
                            <div style={{ fontSize: 12 }}>Sẽ hiển thị mã QR thực tế</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                          <div><strong>Thông tin chuyển khoản:</strong></div>
                          <div>Ngân hàng: Vietcombank</div>
                          <div>Số tài khoản: 1234567890</div>
                          <div>Chủ tài khoản: Công ty Quản lý Chung cư</div>
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
                          <div>Hệ thống sẽ xác nhận thanh toán ngay lập tức</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              </Form.Item>

              <Form.Item
                name="notes"
                label={intl.formatMessage({ id: 'pages.bill.paymentNotes' }) || 'Ghi chú'}
              >
                <Input.TextArea
                  placeholder={intl.formatMessage({ id: 'pages.bill.paymentNotesPlaceholder' }) || 'Nhập ghi chú (tùy chọn)'}
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
