import { useState, useRef } from 'react';
import { ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, message, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { getResidents, createResident, updateResident, deleteResident, ResidentItem } from '@/services/resident';

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ResidentItem | null>(null);
  const [form] = Form.useForm();

  const columns: ProColumns<ResidentItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.fullName' }),
      dataIndex: ['user', 'fullName'],
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.email' }),
      dataIndex: ['user', 'email'],
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.phone' }),
      dataIndex: ['user', 'phone'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.apartment' }),
      dataIndex: ['apartment', 'code'],
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.identityCard' }),
      dataIndex: 'identityCard',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.status' }),
      dataIndex: ['user', 'isActive'],
      search: false,
      render: (_, record) => (
        <Tag color={record.user?.isActive ? 'green' : 'red'}>
          {record.user?.isActive
            ? intl.formatMessage({ id: 'pages.resident.active' })
            : intl.formatMessage({ id: 'pages.resident.inactive' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'pages.resident.actions' }),
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {intl.formatMessage({ id: 'pages.resident.edit' })}
        </Button>,
        <Button
          key="delete"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          {intl.formatMessage({ id: 'pages.resident.delete' })}
        </Button>,
      ],
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: ResidentItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      fullName: record.user?.fullName,
      email: record.user?.email,
      phone: record.user?.phone,
      isActive: record.user?.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.resident.deleteConfirm' }),
      content: intl.formatMessage({ id: 'pages.resident.deleteContent' }),
      onOk: async () => {
        try {
          await deleteResident(id);
          message.success(intl.formatMessage({ id: 'pages.resident.deleteSuccess' }));
          actionRef.current?.reload();
        } catch (error) {
          message.error(intl.formatMessage({ id: 'pages.resident.deleteError' }));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRecord) {
        await updateResident(editingRecord.id, values);
        message.success(intl.formatMessage({ id: 'pages.resident.updateSuccess' }));
      } else {
        await createResident(values);
        message.success(intl.formatMessage({ id: 'pages.resident.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pages.resident.actionError' }));
    }
  };

  return (
    <>
      <ProTable<ResidentItem>
        headerTitle={intl.formatMessage({ id: 'pages.resident.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {intl.formatMessage({ id: 'pages.resident.addNew' })}
          </Button>,
        ]}
        request={async () => {
          const data = await getResidents();
          return {
            data,
            success: true,
          };
        }}
        columns={columns}
      />

      <Modal
        title={editingRecord
          ? intl.formatMessage({ id: 'pages.resident.editTitle' })
          : intl.formatMessage({ id: 'pages.resident.addTitle' })}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingRecord && (
            <>
              <Form.Item
                name="email"
                label={intl.formatMessage({ id: 'pages.resident.email' })}
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'pages.resident.emailRequired' }) },
                  { type: 'email', message: intl.formatMessage({ id: 'pages.resident.emailInvalid' }) }
                ]}
              >
                <Input placeholder={intl.formatMessage({ id: 'pages.resident.emailPlaceholder' })} />
              </Form.Item>
              <Form.Item
                name="password"
                label={intl.formatMessage({ id: 'pages.resident.password' })}
                rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.passwordRequired' }) }]}
              >
                <Input.Password placeholder={intl.formatMessage({ id: 'pages.resident.passwordPlaceholder' })} />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="fullName"
            label={intl.formatMessage({ id: 'pages.resident.fullName' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.fullNameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.fullNamePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={intl.formatMessage({ id: 'pages.resident.phone' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.phonePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="apartmentId"
            label={intl.formatMessage({ id: 'pages.resident.apartment' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pages.resident.apartmentRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.apartmentPlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="identityCard"
            label={intl.formatMessage({ id: 'pages.resident.identityCard' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.resident.identityCardPlaceholder' })} />
          </Form.Item>
          {editingRecord && (
            <Form.Item
              name="isActive"
              label={intl.formatMessage({ id: 'pages.resident.status' })}
              valuePropName="checked"
            >
              <Switch
                checkedChildren={intl.formatMessage({ id: 'pages.resident.active' })}
                unCheckedChildren={intl.formatMessage({ id: 'pages.resident.inactive' })}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};
