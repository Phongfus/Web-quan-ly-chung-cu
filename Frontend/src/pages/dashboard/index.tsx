import {
  Card,
  Col,
  Row,
  Statistic,
  Segmented,
  DatePicker,
  List,
} from 'antd';
import { Column, Line, Pie } from '@ant-design/plots';
import {
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  ToolOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useIntl } from '@umijs/max';
import { getDashboard } from '@/services/dashboard';

/**
 * ✅ TYPE CHUẨN (fix lỗi TS luôn)
 */
type DashboardData = {
  totalApartment: number;
  totalResident: number;
  revenue: number;
  maintenance: number;
  revenueData: { month: string; value: number }[];
  residentData: { day: string; value: number }[];
  billChartData: { type: string; value: number }[];
  activities: string[];
};

const Dashboard = () => {
  const intl = useIntl();
  const [chartType, setChartType] = useState<'column' | 'line' | 'pie'>('pie');
  const [year, setYear] = useState(dayjs());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    getDashboard({ year: year.format('YYYY') })
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const renderActivityItem = (item: string, index: number) => {
    let icon;
    let color = '#1890ff';

    if (item.includes('Cư dân mới')) {
      icon = <UserAddOutlined />;
      color = '#52c41a';
    } else if (item.includes('Thanh toán thành công')) {
      icon = <CheckCircleOutlined />;
      color = '#52c41a';
    } else if (item.includes('Yêu cầu sửa chữa')) {
      icon = <SettingOutlined />;
      color = '#faad14';
    } else if (item.includes('Hóa đơn chưa thanh toán')) {
      icon = <ExclamationCircleOutlined />;
      color = '#ff4d4f';
    }

    return (
      <List.Item key={index}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontSize: '16px' }}>{icon}</span>
          <span>{item}</span>
        </div>
      </List.Item>
    );
  };

  const renderChart = () => {
    if (chartType === 'pie') {
      if (!data?.revenueData?.length) return <div>{intl.formatMessage({ id: 'pages.dashboard.noData' })}</div>;

      return (
        <Pie
          data={data.revenueData.filter((item) => item.value > 0).map((item) => ({
            type: item.month,
            value: item.value,
          }))}
          angleField="value"
          colorField="type"
          radius={0.8}
          height={320}
        />
      );
    }

    if (!data?.revenueData?.length) return <div>{intl.formatMessage({ id: 'pages.dashboard.noData' })}</div>;

    const chartProps = {
      data: data.revenueData,
      xField: 'month',
      yField: 'value',
      height: 320,
      meta: {
        value: {
          alias: intl.formatMessage({ id: 'pages.dashboard.revenue' }),
          formatter: (value: number) => `${Number(value).toLocaleString()} đ`,
        },
        month: {
          alias: intl.formatMessage({ id: 'pages.dashboard.month' }),
        },
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: intl.formatMessage({ id: 'pages.dashboard.revenue' }),
          value: `${Number(datum.value).toLocaleString()} đ`,
        }),
      },
      xAxis: {
        title: {
          text: intl.formatMessage({ id: 'pages.dashboard.month' }),
        },
      },
      yAxis: {
        title: {
          text: intl.formatMessage({ id: 'pages.dashboard.revenue' }),
        },
      },
    };

    if (chartType === 'line') {
      return <Line {...chartProps} smooth point={{ size: 4 }} />;
    }

    return (
      <Column
        {...chartProps}
        label={{
          position: 'middle',
          style: {
            fill: '#FFFFFF',
            opacity: 0.85,
          },
        }}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <h3 style={{ margin: 0, marginBottom: 8, color: '#000000' }}>Thống kê theo năm</h3>
            <DatePicker
              picker="year"
              value={year}
              onChange={(v) => v && setYear(v)}
              style={{ width: 200 }}
              placeholder="Chọn năm"
            />
          </div>
        </Col>

        <Col span={6}>
          <Card
            loading={loading}
            style={{ borderLeft: '4px solid #1890ff' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HomeOutlined style={{ color: '#1890ff' }} />
                  <span>{intl.formatMessage({ id: 'pages.dashboard.apartments' })}</span>
                </div>
              }
              value={data?.totalApartment || 0}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            loading={loading}
            style={{ borderLeft: '4px solid #52c41a' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamOutlined style={{ color: '#52c41a' }} />
                  <span>{intl.formatMessage({ id: 'pages.dashboard.residents' })}</span>
                </div>
              }
              value={data?.totalResident || 0}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            loading={loading}
            style={{ borderLeft: '4px solid #faad14' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarOutlined style={{ color: '#faad14' }} />
                  <span>{intl.formatMessage({ id: 'pages.dashboard.revenue' })}</span>
                </div>
              }
              value={data?.revenue || 0}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
              formatter={(value) =>
                `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })} đ`
              }
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            loading={loading}
            style={{ borderLeft: '4px solid #ff4d4f' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ToolOutlined style={{ color: '#ff4d4f' }} />
                  <span>{intl.formatMessage({ id: 'pages.dashboard.maintenance' })}</span>
                </div>
              }
              value={data?.maintenance || 0}
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col span={16}>
          <Card
            title={intl.formatMessage({ id: 'pages.dashboard.revenueChart' })}
            loading={loading}
            extra={
              <Segmented
                options={[
                  { label: intl.formatMessage({ id: 'pages.dashboard.column' }), value: 'column' },
                  { label: intl.formatMessage({ id: 'pages.dashboard.line' }), value: 'line' },
                  { label: intl.formatMessage({ id: 'pages.dashboard.pie' }), value: 'pie' },
                ]}
                value={chartType}
                onChange={(val) => setChartType(val as 'column' | 'line' | 'pie')}
              />
            }
          >
            {renderChart()}
          </Card>
        </Col>

        <Col span={8}>
          <Card title={intl.formatMessage({ id: 'pages.dashboard.activities' })} loading={loading}>
            <List
              dataSource={data?.activities || []}
              renderItem={renderActivityItem}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card 
            title={intl.formatMessage({ id: 'pages.dashboard.residentsByDay' })} 
            loading={loading}
          >
            <Line
              data={data?.residentData || []}
              xField="day"
              yField="value"
              smooth
              height={300}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;