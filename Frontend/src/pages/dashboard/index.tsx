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
  activities: string[];
};

const Dashboard = () => {
  const intl = useIntl();
  const [chartType, setChartType] = useState<'column' | 'line' | 'pie'>('column');
  const [month, setMonth] = useState(dayjs());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    getDashboard({ month: month.format('YYYY-MM') })
      .then((res) => {
        console.log("DATA:", res);
        setData(res);
      })
      .catch((err) => {
        console.error("ERROR:", err);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const renderChart = () => {
    if (!data?.revenueData?.length) return <div>{intl.formatMessage({ id: 'pages.dashboard.noData' })}</div>;

    if (chartType === 'line') {
      return (
        <Line
          data={data.revenueData}
          xField="month"
          yField="value"
          smooth
          height={300}
        />
      );
    }

    if (chartType === 'pie') {
      return (
        <Pie
          data={data.revenueData.map((i) => ({
            type: i.month,
            value: i.value,
          }))}
          angleField="value"
          colorField="type"
          radius={0.8}
          height={300}
        />
      );
    }

    return (
      <Column
        data={data.revenueData}
        xField="month"
        yField="value"
        height={300}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <DatePicker
          picker="month"
          value={month}
          onChange={(v) => v && setMonth(v)}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={intl.formatMessage({ id: 'pages.dashboard.apartments' })} value={data?.totalApartment || 0} />
          </Card>
        </Col>

        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={intl.formatMessage({ id: 'pages.dashboard.residents' })} value={data?.totalResident || 0} />
          </Card>
        </Col>

        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title={intl.formatMessage({ id: 'pages.dashboard.revenue' })}
              value={data?.revenue || 0}
              formatter={(v) => `${Number(v).toLocaleString()} đ`}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card loading={loading}>
            <Statistic title={intl.formatMessage({ id: 'pages.dashboard.maintenance' })} value={data?.maintenance || 0} />
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
                onChange={(val) => setChartType(val as any)}
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
              renderItem={(item: string, index: number) => (
                <List.Item key={index}>{item}</List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title={intl.formatMessage({ id: 'pages.dashboard.residentsByDay' })} loading={loading}>
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