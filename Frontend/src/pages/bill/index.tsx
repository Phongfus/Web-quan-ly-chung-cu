import { useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, DatePicker, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { getBills, createBill, updateBill, deleteBill, BillItem } from '@/services/bill';
import dayjs from 'dayjs';

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillItem | null>(null);
  const [form] = Form.useForm();

  const columns: ProColumns<BillItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.apartment' }),
      dataIndex: ['apartment', 'code'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.monthYear' }),
      dataIndex: 'month',
      search: false,
      render: (_, record) => `${record.month}/${record.year}`,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.electricityFee' }),
      dataIndex: 'electricityFee',
      search: false,
      render: (_, record) => record.electricityFee?.toLocaleString('vi-VN') + ' đ',
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.waterFee' }),
      dataIndex: 'waterFee',
      search: false,
      render: (_, record) => record.waterFee?.toLocaleString('vi-VN') + ' đ',
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.serviceFee' }),
      dataIndex: 'serviceFee',
      search: false,
      render: (_, record) => record.serviceFee?.toLocaleString('vi-VN') + ' đ',
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.totalAmount' }),
      dataIndex: 'amount',
      search: false,
      render: (_, record) => <strong>{record.amount?.toLocaleString('vi-VN')} đ</strong>,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.dueDate' }),
      dataIndex: 'dueDate',
      valueType: 'date',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.bill.status' }),
      dataIndex: 'status',
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

  return (
    <>
      <ProTable<BillItem>
        headerTitle={intl.formatMessage({ id: 'pages.bill.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {intl.formatMessage({ id: 'pages.bill.addNew' })}
          </Button>,
        ]}
        request={async () => {
          const data = await getBills();
          return {
            data,
            success: true,
          };
        }}
        columns={columns}
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
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.bill.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.apartmentRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.bill.apartmentPlaceholder' })} />
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
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.bill.amountRequired' }) }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'pages.bill.amountPlaceholder' })} />
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
              <Input placeholder={intl.formatMessage({ id: 'pages.bill.statusPlaceholder' })} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
