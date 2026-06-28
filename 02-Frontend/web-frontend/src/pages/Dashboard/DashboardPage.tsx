import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Button, List, Avatar, Tag, Progress, Empty } from 'antd';
import {
  BookOutlined,
  UserAddOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/student';
import { lessonApi } from '@/api/lesson';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: studentsData } = useQuery({
    queryKey: ['students', { page: 1, pageSize: 5 }],
    queryFn: () => studentApi.getStudents({ page: 1, pageSize: 5 }),
  });

  const { data: lessonsData } = useQuery({
    queryKey: ['lessons', { page: 1, pageSize: 5 }],
    queryFn: () => lessonApi.getLessons({ page: 1, pageSize: 5 }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['studentDashboardStats'],
    queryFn: () => studentApi.getDashboardStats(),
  });

  const stats = statsData?.data || { midtermTarget: 75, knowledgeMastery: 60, homeworkCompletion: 85 };

  const students = studentsData?.data?.items || [];
  const lessons = lessonsData?.data?.items || [];
  const totalStudents = studentsData?.data?.total || 0;
  const totalLessons = lessonsData?.data?.total || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          {getGreeting()}，{user?.realName || '老师'}！
        </h1>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="我的学生"
              value={totalStudents}
              prefix={<UserAddOutlined className="text-primary-500" />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="累计备课"
              value={totalLessons}
              prefix={<BookOutlined className="text-green-500" />}
              suffix="份"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="本周备课"
              value={lessons.filter((l) => dayjs(l.createdAt).isAfter(dayjs().startOf('week'))).length}
              prefix={<CalendarOutlined className="text-orange-500" />}
              suffix="份"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="平均评分"
              value={4.8}
              prefix={<RiseOutlined className="text-blue-500" />}
              suffix="分"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="快速开始"
            bordered={false}
            className="shadow-sm mb-6"
            extra={
              <Button type="link" onClick={() => navigate('/lessons/new')}>
                新建备课 <ArrowRightOutlined />
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<BookOutlined />}
                  onClick={() => navigate('/lessons/new')}
                  className="h-20 text-base"
                >
                  新建备课
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  size="large"
                  block
                  icon={<UserAddOutlined />}
                  onClick={() => navigate('/students/new')}
                  className="h-20 text-base"
                >
                  添加学生
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  size="large"
                  block
                  icon={<CalendarOutlined />}
                  onClick={() => navigate('/progress')}
                  className="h-20 text-base"
                >
                  查看日程
                </Button>
              </Col>
            </Row>
          </Card>

          <Card
            title="最近备课"
            bordered={false}
            className="shadow-sm"
            extra={
              <Button type="link" onClick={() => navigate('/lessons/history')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
          >
            {lessons.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={lessons.slice(0, 5)}
                renderItem={(lesson) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        key="continue"
                        onClick={() => navigate(`/lessons/${lesson.id}`)}
                      >
                        继续编辑
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{ backgroundColor: '#6366F1' }}
                          icon={<BookOutlined />}
                        />
                      }
                      title={
                        <span>
                          {lesson.grade} · {lesson.subject} · {lesson.teachingGoal}
                        </span>
                      }
                      description={
                        <span className="text-gray-400 text-sm">
                          <ClockCircleOutlined className="mr-1" />
                          {dayjs(lesson.createdAt).fromNow()}
                          <Tag
                            color={lesson.status === 'completed' ? 'green' : lesson.status === 'failed' ? 'red' : 'orange'}
                            className="ml-2"
                          >
                            {lesson.status === 'completed' ? '已完成' : lesson.status === 'failed' ? '生成失败' : '生成中'}
                          </Tag>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无备课记录">
                <Button type="primary" onClick={() => navigate('/lessons/new')}>
                  创建第一个备课
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="我的学生" bordered={false} className="shadow-sm mb-6">
            {students.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={students.slice(0, 5)}
                renderItem={(student) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        key="view"
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        查看
                      </Button>,
                      <Button
                        type="link"
                        key="lesson"
                        onClick={() => navigate(`/lessons/new?studentId=${student.id}`)}
                      >
                        备课
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={student.photoUrl || '/assets/default-avatar.png'}
                        />
                      }
                      title={student.name}
                      description={`${student.grade} · ${student.currentSubject || student.grade}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无学生">
                <Button type="primary" onClick={() => navigate('/students/new')}>
                  添加第一个学生
                </Button>
              </Empty>
            )}
          </Card>

          <Card title="学习目标进度" bordered={false} className="shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>期中考试目标</span>
                  <span className="text-primary-600">{stats.midtermTarget}%</span>
                </div>
                <Progress percent={stats.midtermTarget} showInfo={false} strokeColor="#6366F1" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>知识点掌握度</span>
                  <span className="text-green-600">{stats.knowledgeMastery}%</span>
                </div>
                <Progress percent={stats.knowledgeMastery} showInfo={false} strokeColor="#10B981" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>作业完成率</span>
                  <span className="text-orange-600">{stats.homeworkCompletion}%</span>
                </div>
                <Progress percent={stats.homeworkCompletion} showInfo={false} strokeColor="#F59E0B" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}
