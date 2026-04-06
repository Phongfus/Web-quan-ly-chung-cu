import { Space, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { SelectLang } from '@umijs/max';
import { AvatarDropdown, AvatarName } from './AvatarDropdown';

export const RightContent = () => {
  const { initialState } = useModel('@@initialState');

  console.log("RIGHT CONTENT OK", initialState);

  if (!initialState) return <div />;

  return (
    <Space size="middle">
      <SelectLang />

      <AvatarDropdown>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <AvatarName />
        </Space>
      </AvatarDropdown>
    </Space>
  );
};

export default RightContent;