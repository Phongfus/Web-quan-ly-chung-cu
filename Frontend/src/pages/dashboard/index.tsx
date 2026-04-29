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
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useIntl, useModel } from '@umijs/max';
import { getDashboard } from '@/services/dashboard';

/**
 * ✅ TYPE DEFINITION
 */
type DashboardData = {
  totalApartment: string | number;
  totalResident: number;
  revenue: number;
  paidInvoiceTotal?: number;
  unpaidInvoiceTotal?: number;
  upcomingOverdueTotal?: number;
  overdueTotal?: number;
  maintenance: number;
  complaintPending: number;
  revenueData: { month: string; value: number }[];
  residentData?: { day: string; value: number }[];
  costData?: { month: string; type: string; value: number }[];
  billChartData: { type: string; value: number }[];
  activities: string[];
  notifications?: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }>;
  maintenanceItems?: Array<{
    id: string;
    type: string;
    status: string;
    description: string;
    createdAt: string;
  }>;
};

const Dashboard = () => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isResident = currentUser?.role === 'RESIDENT';

  const [chartType, setChartType] = useState<'column' | 'line' | 'pie'>('column');
  const [year, setYear] = useState(dayjs());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Backend tự nhận diện Role qua Token, chỉ cần gửi Year
    getDashboard({ year: year.format('YYYY') })
      .then((res) => {
        console.log('📊 Dashboard data received:', res);
        console.log('🏠 totalApartment:', res?.totalApartment, typeof res?.totalApartment);
        setData(res);
      })
      .catch((err) => {
        console.error('Dashboard API Error:', err);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const getActivityValue = (label: string) => {
    const activity = data?.activities?.find((item) => item.includes(label));
    if (!activity) return 0;
    const parts = activity.split(':');
    return parts.length > 1 ? Number(parts[1].trim()) : 0;
  };

  const activityList = () => {
    if (!data) return [];

    if (isResident) {
      return [
        `Hóa đơn đã thanh toán: ${getActivityValue('Hóa đơn đã thanh toán')}`,
        `Hóa đơn chưa thanh toán: ${getActivityValue('Hóa đơn chưa thanh toán')}`,
        `Hóa đơn sắp quá hạn: ${getActivityValue('Hóa đơn sắp quá hạn')}`,
        `Hóa đơn quá hạn: ${getActivityValue('Hóa đơn quá hạn')}`,
        `Yêu cầu sửa chữa: ${data.maintenance ?? 0}`,
      ];
    }

    return [
      `Hóa đơn đã thanh toán: ${getActivityValue('Hóa đơn đã thanh toán')}`,
      `Hóa đơn chưa thanh toán: ${getActivityValue('Hóa đơn chưa thanh toán')}`,
      `Hóa đơn sắp quá hạn: ${getActivityValue('Hóa đơn sắp quá hạn')}`,
      `Hóa đơn quá hạn: ${getActivityValue('Hóa đơn quá hạn')}`,
      `Yêu cầu sửa chữa: ${data.maintenance ?? 0}`,
    ];
  };

  const renderActivityItem = (item: string, index: number) => {
    let icon = <CheckCircleOutlined />;
    let color = '#1890ff';

    if (item.includes('sửa chữa') || item.includes('trì')) {
      icon = <SettingOutlined />;
      color = '#faad14';
    } else if (item.includes('Hóa đơn đã thanh toán')) {
      icon = <CheckCircleOutlined />;
      color = '#52c41a';
    } else if (item.includes('Hóa đơn chưa thanh toán')) {
      icon = <ExclamationCircleOutlined />;
      color = '#ff4d4f';
    } else if (item.includes('Hóa đơn sắp quá hạn')) {
      icon = <ClockCircleOutlined />;
      color = '#faad14';
    } else if (item.includes('Hóa đơn quá hạn')) {
      icon = <CloseCircleOutlined />;
      color = '#ff4d4f';
    } else if (item.includes('Hóa đơn')) {
      icon = <DollarOutlined />;
      color = item.includes('chưa') ? '#ff4d4f' : '#52c41a';
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

  const feeColorMap: Record<string, string> = {
    Điện: '#1890ff',
    Nước: '#52c41a',
    'Phí dịch vụ': '#faad14',
  };

  const getFeeColor = (type: string) => feeColorMap[type] || '#888';

  const renderChart = () => {
    if (!data) return null;

    // Giao diện cho Cư dân: Ưu tiên biểu đồ tròn (Pie) hoặc biểu đồ chi phí chi tiết (CostData)
    if (isResident) {
      if (chartType === 'pie') {
        return (
          <Pie
            data={data.billChartData || []}
            angleField="value"
            colorField="type"
            color={(d: any) => getFeeColor(d.type)}
            radius={0.8}
            height={320}
          />
        );
      }

      const residentChartProps = {
        data: data.costData || [],
        xField: 'month',
        yField: 'value',
        seriesField: 'type',
        colorField: 'type',
        color: ({ type }: { type: string }) => getFeeColor(type),
        height: 320,
        smooth: chartType === 'line',
      };

      return chartType === 'line' ? <Line {...residentChartProps} /> : <Column {...residentChartProps} />;
    }

    // Giao diện cho Admin: Biểu đồ doanh thu tổng quát
    if (chartType === 'pie') {
      return (
        <Pie
          data={data.revenueData.map(d => ({ type: d.month, value: d.value }))}
          angleField="value"
          colorField="type"
          radius={0.8}
          height={320}
        />
      );
    }

    const adminChartProps = {
      data: data.revenueData,
      xField: 'month',
      yField: 'value',
      height: 320,
      smooth: chartType === 'line',
    };

    return chartType === 'line' ? <Line {...adminChartProps} /> : <Column {...adminChartProps} />;
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 8 }}>{intl.formatMessage({ id: 'pages.dashboard.statisticsByYear' })}</h3>
            <DatePicker
              picker="year"
              value={year}
              onChange={(v) => v && setYear(v)}
              allowClear={false}
              style={{ width: 200 }}
            />
          </div>
        </Col>

        {/* Năm thẻ thống kê chính */}
        <Col span={4}>
          <Card key={String(data?.totalApartment)} loading={loading} style={{ borderLeft: '4px solid #1890ff' }}>
            <Statistic
              title={isResident ? 'Mã căn hộ' : 'Tổng căn hộ'}
              value={isResident ? String(data?.totalApartment ?? 'N/A') : (data?.totalApartment || 0)}
              valueRender={() => <span>{isResident ? String(data?.totalApartment ?? 'N/A') : (data?.totalApartment || 0)}</span>}
              prefix={<HomeOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title={isResident ? 'Hóa đơn đã thanh toán' : 'Tổng cư dân'}
              value={isResident ? data?.paidInvoiceTotal ?? 0 : data?.totalResident || 0}
              suffix={isResident ? 'đ' : undefined}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #faad14' }}>
            <Statistic
              title={isResident ? 'Hóa đơn chưa thanh toán' : 'Doanh thu'}
              value={isResident ? data?.unpaidInvoiceTotal ?? 0 : data?.revenue || 0}
              suffix='đ'
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #ff4d4f' }}>
            <Statistic
              title={isResident ? 'Sắp quá hạn' : 'Yêu cầu sửa chữa'}
              value={isResident ? data?.upcomingOverdueTotal ?? 0 : data?.maintenance || 0}
              suffix={isResident ? 'đ' : undefined}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #722ed1' }}>
            <Statistic
              title={isResident ? 'Quá hạn' : 'Khiếu nại chờ xử lý'}
              value={isResident ? data?.overdueTotal ?? 0 : data?.complaintPending || 0}
              suffix={isResident ? 'đ' : undefined}
              prefix={<CloseCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      
        {/* Khu vực biểu đồ và Hoạt động */}
        <Col span={16}>
          <Card
            title={intl.formatMessage({ id: isResident ? 'pages.dashboard.costChart' : 'pages.dashboard.revenueChart' })}
            loading={loading}
            extra={
              <Segmented
                options={[
                  { label: intl.formatMessage({ id: 'pages.dashboard.chart.column' }), value: 'column' },
                  { label: intl.formatMessage({ id: 'pages.dashboard.chart.line' }), value: 'line' },
                  { label: intl.formatMessage({ id: 'pages.dashboard.chart.pie' }), value: 'pie' },
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
              dataSource={activityList()}
              renderItem={renderActivityItem}
              locale={{ emptyText: intl.formatMessage({ id: 'pages.dashboard.noActivities' }) }}
            />
          </Card>
        </Col>

      </Row>
    </div>
  );
};

export default Dashboard;