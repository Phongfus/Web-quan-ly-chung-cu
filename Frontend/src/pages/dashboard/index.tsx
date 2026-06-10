// Thư viện Ant Design dùng cho layout và các component hiển thị
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
// Icon dùng để hiển thị biểu tượng trong các thẻ số liệu và danh sách hoạt động
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
import { useModel } from '@umijs/max';
import { getDashboard } from '@/services/dashboard';

// Kiểu dữ liệu cho Dashboard, xác định cấu trúc dữ liệu API trả về
// Dùng để TypeScript kiểm tra và hỗ trợ gợi ý khi truy cập các trường dữ liệu
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
  activities: Array<{ key: string; count: number }>;
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
  // Lấy trạng thái toàn cục do Umi cung cấp: thông tin người dùng, cấu hình ban đầu
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  // Kiểm tra xem người dùng hiện tại có phải cư dân hay không
  const isResident = currentUser?.role === 'RESIDENT';

  // Trạng thái local component
  const [chartType, setChartType] = useState<'column' | 'line' | 'pie'>('column');
  const [year, setYear] = useState(dayjs());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Gọi API Dashboard. Backend tự nhận diện Role từ Token,
    // nên frontend chỉ cần gửi năm để lọc dữ liệu.
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

  // Trả về giá trị của hoạt động theo key, nếu không tìm thấy thì trả về 0
  const getActivityValue = (key: string) => {
    const activity = data?.activities?.find((item) => item.key === key);
    return activity?.count || 0;
  };

  // Tạo danh sách hoạt động hiển thị trong cột bên phải
  // Mỗi phần tử là một chuỗi mô tả và số lượng
  const activityList = () => {
    if (!data) return [];

    const paidBillsLabel = 'Hóa đơn đã thanh toán';
    const unpaidBillsLabel = 'Hóa đơn chưa thanh toán';
    const upcomingOverdueLabel = 'Hóa đơn sắp quá hạn';
    const overdueLabel = 'Hóa đơn quá hạn';
    const maintenanceLabel = 'Yêu cầu sửa chữa';

    return [
      `${paidBillsLabel}: ${getActivityValue('paidBills')}`,
      `${unpaidBillsLabel}: ${getActivityValue('unpaidBills')}`,
      `${upcomingOverdueLabel}: ${getActivityValue('upcomingOverdueBills')}`,
      `${overdueLabel}: ${getActivityValue('overdueBills')}`,
      `${maintenanceLabel}: ${getActivityValue('maintenanceRequests')}`,
    ];
  };

  // Hiển thị mỗi dòng hoạt động kèm icon và màu tương ứng
  const renderActivityItem = (item: string, index: number) => {
    const paidBillsLabel = 'Hóa đơn đã thanh toán';
    const unpaidBillsLabel = 'Hóa đơn chưa thanh toán';
    const upcomingOverdueLabel = 'Hóa đơn sắp quá hạn';
    const overdueLabel = 'Hóa đơn quá hạn';
    const maintenanceLabel = 'Yêu cầu sửa chữa';

    let icon = <CheckCircleOutlined />;
    let color = '#1890ff';

    if (item.includes(maintenanceLabel)) {
      icon = <SettingOutlined />;
      color = '#faad14';
    } else if (item.includes(paidBillsLabel)) {
      icon = <CheckCircleOutlined />;
      color = '#52c41a';
    } else if (item.includes(unpaidBillsLabel)) {
      icon = <ExclamationCircleOutlined />;
      color = '#f98ac1';
    } else if (item.includes(upcomingOverdueLabel)) {
      icon = <ClockCircleOutlined />;
      color = '#bd5916';
    } else if (item.includes(overdueLabel)) {
      icon = <CloseCircleOutlined />;
      color = '#ff0004';
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

  // Bản đồ màu cho các loại phí trong biểu đồ cư dân
  const feeColorMap: Record<string, string> = {
    Điện: '#1890ff',
    Nước: '#52c41a',
    'Phí dịch vụ': '#faad14',
  };

  const getFeeColor = (type: string) => feeColorMap[type] || '#888';

  const renderChart = () => {
    if (!data) return null;

    // Nếu người dùng là cư dân thì hiển thị biểu đồ chi phí chi tiết theo loại phí
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

      // Biểu đồ cột hoặc đường với dữ liệu chi phí theo tháng và loại phí
      return chartType === 'line' ? <Line {...residentChartProps} /> : <Column {...residentChartProps} />;
    }

    // Nếu người dùng là Admin thì hiển thị biểu đồ doanh thu theo tháng
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

  // Các thành phần giao diện chính của Dashboard
  // Bao gồm: bộ lọc năm, các thẻ số liệu, biểu đồ và danh sách hoạt động
  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 8 }}>{'Thống kê theo năm'}</h3>
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
              prefix={isResident ? <DollarOutlined style={{ color: '#52c41a' }} /> : <TeamOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #ff7bd1' }}>
            <Statistic
              title={isResident ? 'Hóa đơn chưa thanh toán' : 'Doanh thu'}
              value={isResident ? data?.unpaidInvoiceTotal ?? 0 : data?.revenue || 0}
              suffix='đ'
              prefix={isResident ? <ExclamationCircleOutlined style={{ color: '#ff7bd1' }} /> : <DollarOutlined style={{ color: '#ff7bd1' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #fa7b7d' }}>
            <Statistic
              title={isResident ? 'Sắp quá hạn' : 'Yêu cầu sửa chữa'}
              value={isResident ? data?.upcomingOverdueTotal ?? 0 : data?.maintenance || 0}
              suffix={isResident ? 'đ' : undefined}
              prefix={isResident ? <ClockCircleOutlined style={{ color: '#fa7b7d' }} /> : <ToolOutlined style={{ color: '#fa7b7d' }} />}
            />
          </Card>
        </Col>

        <Col span={5}>
          <Card loading={loading} style={{ borderLeft: '4px solid #fc0000' }}>
            <Statistic
              title={isResident ? 'Quá hạn' : 'Khiếu nại chờ xử lý'}
              value={isResident ? data?.overdueTotal ?? 0 : data?.complaintPending || 0}
              suffix={isResident ? 'đ' : undefined}
              prefix={isResident ? <CloseCircleOutlined style={{ color: '#fc0000' }} /> : <ExclamationCircleOutlined style={{ color: '#fc0000' }} />}
            />
          </Card>
        </Col>
      
        {/* Khu vực biểu đồ và Hoạt động */}
        <Col span={16}>
          <Card
            title={isResident ? 'Biểu đồ chi phí' : 'Biểu đồ doanh thu'}
            loading={loading}
            extra={
              <Segmented
                options={[
                  { label: 'Cột', value: 'column' },
                  { label: 'Đường', value: 'line' },
                  { label: 'Tròn', value: 'pie' },
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
          <Card title={'Hoạt động'} loading={loading}>
            <List
              dataSource={activityList()}
              renderItem={renderActivityItem}
              locale={{ emptyText: 'Không có hoạt động mới' }}
            />
          </Card>
        </Col>

      </Row>
    </div>
  );
};

export default Dashboard;