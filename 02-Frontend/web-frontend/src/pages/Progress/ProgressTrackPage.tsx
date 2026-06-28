import { Card, Row, Col, Progress, Empty, Button } from 'antd';
import { CalendarOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function ProgressTrackPage() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">教学进度</h1>
        <p className="page-description">跟踪和管理您的教学进度</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm mb-1">本月完成课时</div>
                <div className="text-3xl font-bold text-primary-600">24</div>
                <div className="text-sm text-gray-400 mt-1">/ 30 课时</div>
              </div>
              <div className="w-16 h-16">
                <Progress type="circle" percent={80} size={64} strokeColor="#6366F1" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm mb-1">学生总数</div>
                <div className="text-3xl font-bold text-green-600">8</div>
                <div className="text-sm text-gray-400 mt-1">在读学生</div>
              </div>
              <TeamOutlined className="text-4xl text-green-100" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm mb-1">本月进步率</div>
                <div className="text-3xl font-bold text-orange-600">+12%</div>
                <div className="text-sm text-gray-400 mt-1">相比上月</div>
              </div>
              <RiseOutlined className="text-4xl text-orange-100" />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="课程安排"
            variant="borderless"
            className="shadow-sm mb-6"
            extra={
              <Button type="primary" icon={<CalendarOutlined />}>
                安排课程
              </Button>
            }
          >
            <Empty description="暂无课程安排">
              <Button type="primary" onClick={() => navigate('/lessons/new')}>
                创建第一个备课
              </Button>
            </Empty>
          </Card>

          <Card title="学习进度概览" variant="borderless" className="shadow-sm">
            <Empty description="暂无学习进度数据" />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="知识点完成情况" variant="borderless" className="shadow-sm mb-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>一次函数</span>
                  <span className="text-primary-600">80%</span>
                </div>
                <Progress percent={80} showInfo={false} strokeColor="#6366F1" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>二次函数</span>
                  <span className="text-orange-600">45%</span>
                </div>
                <Progress percent={45} showInfo={false} strokeColor="#F59E0B" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>三角形</span>
                  <span className="text-green-600">100%</span>
                </div>
                <Progress percent={100} showInfo={false} strokeColor="#10B981" />
              </div>
            </div>
          </Card>

          <Card title="最近活动" variant="borderless" className="shadow-sm">
            <Empty description="暂无最近活动" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
