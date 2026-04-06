import { useState, useRef } from "react";
import { ProTable, ActionType, ProColumns } from "@ant-design/pro-components";
import { Button, Tag, Modal, Form, Input, Select, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useIntl } from "@umijs/max";

import {
  getApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  ApartmentItem,
} from "@/services/apartment";

const { Option } = Select;

export default () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApartmentItem | null>(null);
  const [form] = Form.useForm();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "green";
      case "OCCUPIED":
        return "blue";
      case "MAINTENANCE":
        return "orange";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return intl.formatMessage({ id: 'pages.apartment.status.available' });
      case "OCCUPIED":
        return intl.formatMessage({ id: 'pages.apartment.status.occupied' });
      case "MAINTENANCE":
        return intl.formatMessage({ id: 'pages.apartment.status.maintenance' });
      default:
        return status;
    }
  };

  const columns: ProColumns<ApartmentItem>[] = [
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
      if (editingRecord) {
        await updateApartment(editingRecord.id, values);
        message.success(intl.formatMessage({ id: 'pages.apartment.updateSuccess' }));
      } else {
        await createApartment(values);
        message.success(intl.formatMessage({ id: 'pages.apartment.createSuccess' }));
      }
      setIsModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error(intl.formatMessage({ id: 'pages.apartment.actionError' }));
    }
  };

  return (
    <>
      <ProTable<ApartmentItem>
        headerTitle={intl.formatMessage({ id: 'pages.apartment.title' })}
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
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
          return {
            data,
            success: true,
          };
        }}
        columns={columns}
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
            <Input placeholder={intl.formatMessage({ id: 'pages.apartment.floorIdPlaceholder' })} />
          </Form.Item>

          <Form.Item
            name="typeId"
            label={intl.formatMessage({ id: 'pages.apartment.typeId' })}
            rules={[{ required: true }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'pages.apartment.typeIdPlaceholder' })} />
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
              <Option value="OCCUPIED">
                {intl.formatMessage({ id: 'pages.apartment.status.occupied' })}
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
