import { useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { getServices, createService, updateService, deleteService, ServiceItem } from '@/services/service';

const { TextArea } = Input;
const { Option } = Select;

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceItem | null>(null);
  const [form] = Form.useForm();

  const getServiceTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      ELECTRIC: intl.formatMessage({ id: 'pages.service.type.electric' }),
      WATER: intl.formatMessage({ id: 'pages.service.type.water' }),
      AIR_CONDITIONER: intl.formatMessage({ id: 'pages.service.type.ac' }),
      INTERNET: intl.formatMessage({ id: 'pages.service.type.internet' }),
      OTHER: intl.formatMessage({ id: 'pages.service.type.other' }),
    };
    return typeMap[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      PENDING: { 
        text: intl.formatMessage({ id: 'pages.service.status.pending' }), 
        color: 'orange' 
      },
      PROCESSING: { 
        text: intl.formatMessage({ id: 'pages.service.status.processing' }), 
        color: 'blue' 
      },
      DONE: { 
        text: intl.formatMessage({ id: 'pages.service.status.done' }), 
        color: 'green' 
      },
    };
    return statusMap[status] || { text: status, color: 'default' };
  };

  const columns: ProColumns<ServiceItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.apartment' }),
      dataIndex: ['apartment', 'code'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.requester' }),
      dataIndex: ['requester', 'fullName'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.type' }),
      dataIndex: 'type',
      valueEnum: {
        ELECTRIC: { text: intl.formatMessage({ id: 'pages.service.type.electric' }) },
        WATER: { text: intl.formatMessage({ id: 'pages.service.type.water' }) },
        AIR_CONDITIONER: { text: intl.formatMessage({ id: 'pages.service.type.ac' }) },
        INTERNET: { text: intl.formatMessage({ id: 'pages.service.type.internet' }) },
        OTHER: { text: intl.formatMessage({ id: 'pages.service.type.other' }) },
      },
      render: (_, record) => (
        <Tag>{getServiceTypeText(record.type)}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.service.description' }),
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.status' }),
      dataIndex: 'status',
      valueEnum: {
        PENDING: { text: intl.formatMessage({ id: 'pages.service.status.pending' }) },
        PROCESSING: { text: intl.formatMessage({ id: 'pages.service.status.processing' }) },
        DONE: { text: intl.formatMessage({ id: 'pages.service.status.done' }) },
      },
      render: (_, record) => {
        const status = getStatusConfig(record.status);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.service.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.service.actions' }),
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.service.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.service.delete' })}
        </Button>,
      ],
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ServiceItem) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.service.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.service.deleteContent' }),
      onOk: async () => {
        try {
          await deleteService(id);
          message.success(intl.formatMessage({ id: 'pages.service.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.service.deleteError' }));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        await updateService(editingRecord.id, values);
        message.success(intl.formatMessage({ id: 'pages.service.updateSuccess' }));
      } else {
        await createService(values);
        message.success(intl.formatMessage({ id: 'pages.service.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.service.actionError' }));
    }
  };

  return (
    <>
      <ProTable<ServiceItem>
        headerTitle={intl.formatMessage({ id: 'pages.service.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {intl.formatMessage({ id: 'pages.service.addNew' })}
          </Button>,
        ]}
        request={async () => {
          const data = await getServices();
          return {
            data,
            success: true,
          };
        }}
        columns={columns}
      />

      <Modal
        title={editingRecord 
          ? intl.formatMessage({ id: 'pages.service.editTitle' }) 
          : intl.formatMessage({ id: 'pages.service.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.service.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.service.apartmentRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.service.apartmentPlaceholder' })} />
          </Form.Item>

          <Form.Item
            name="type"
            label={intl.formatMessage({ id: 'pages.service.type' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.service.typeRequired' }) }]}
          >
            <Select placeholder={intl.formatMessage({ id: 'pages.service.typePlaceholder' })}>
              <Option value="ELECTRIC">{intl.formatMessage({ id: 'pages.service.type.electric' })}</Option>
              <Option value="WATER">{intl.formatMessage({ id: 'pages.service.type.water' })}</Option>
              <Option value="AIR_CONDITIONER">{intl.formatMessage({ id: 'pages.service.type.ac' })}</Option>
              <Option value="INTERNET">{intl.formatMessage({ id: 'pages.service.type.internet' })}</Option>
              <Option value="OTHER">{intl.formatMessage({ id: 'pages.service.type.other' })}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={intl.formatMessage({ id: 'pages.service.description' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.service.descriptionRequired' }) }]}
          >
            <TextArea rows={4} placeholder={intl.formatMessage({ id: 'pages.service.descriptionPlaceholder' })} />
          </Form.Item>

          {editingRecord && (
            <Form.Item name="status" label={intl.formatMessage({ id: 'pages.service.status' })}>
              <Select placeholder={intl.formatMessage({ id: 'pages.service.statusPlaceholder' })}>
                <Option value="PENDING">{intl.formatMessage({ id: 'pages.service.status.pending' })}</Option>
                <Option value="PROCESSING">{intl.formatMessage({ id: 'pages.service.status.processing' })}</Option>
                <Option value="DONE">{intl.formatMessage({ id: 'pages.service.status.done' })}</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
