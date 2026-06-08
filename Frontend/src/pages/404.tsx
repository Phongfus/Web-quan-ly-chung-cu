import { history } from '@umijs/max';
import { Button, Card, Result } from 'antd';
import React from 'react';

const NoFoundPage: React.FC = () => (
  <Card variant="borderless">
    <Result
      status="404"
      title="404"
      subTitle="Trang bạn tìm không tồn tại hoặc đã bị xóa."
      extra={
        <Button type="primary" onClick={() => history.push('/')}>
          {'Quay lại trang chủ'}
        </Button>
      }
    />
  </Card>
);

export default NoFoundPage;
