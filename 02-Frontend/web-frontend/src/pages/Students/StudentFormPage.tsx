import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Card, Button, Input, Select, message, Breadcrumb, Divider, Row, Col, InputNumber } from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  EnvironmentOutlined, 
  BookOutlined, 
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/api/student';
import { useStudentStore } from '@/stores/studentStore';
import type { CreateStudentRequest } from '@/types/student';
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/types/lesson';


export default function StudentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const studentId = Number(id);
  const [form] = Form.useForm();
  const { addStudent, updateStudent } = useStudentStore();
  const queryClient = useQueryClient();

  // 失效所有受学生数据变更影响的 React Query 缓存：
  // - ['students', ...]：学生列表 / Dashboard 学生列表 / 备课生成页学生下拉（前缀匹配）
  // - ['student', id] / ['studentProfile', id] / ['teachingGoals', id] / ['studentLessons', id]：详情页四个查询
  // - ['studentDashboardStats']：仪表盘统计（midtermTarget 等字段变更会影响聚合值）
  const invalidateStudentQueries = (sid: number) => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['student', sid] });
    queryClient.invalidateQueries({ queryKey: ['studentProfile', sid] });
    queryClient.invalidateQueries({ queryKey: ['teachingGoals', sid] });
    queryClient.invalidateQueries({ queryKey: ['studentLessons', sid] });
    queryClient.invalidateQueries({ queryKey: ['studentDashboardStats'] });
  };

  useEffect(() => {
    if (isEdit) {
      studentApi.getStudent(studentId).then(res => {
        form.setFieldsValue(res.data);
      });
    }
  }, [isEdit, studentId, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentRequest) => studentApi.createStudent(data),
    onSuccess: (res) => {
      addStudent(res.data);
      // 新增学生后失效列表/统计缓存，返回列表页或 Dashboard 时会重新拉取
      invalidateStudentQueries(res.data.id);
      message.success('添加成功');
      navigate(`/students/${res.data.id}`);
    },
    onError: () => {
      message.error('添加失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => studentApi.updateStudent(studentId, data),
    onSuccess: (res) => {
      updateStudent(studentId, res.data);
      // 编辑后失效该学生相关的所有缓存，跳转到详情页时 useQuery 会重新请求拿最新数据
      invalidateStudentQueries(studentId);
      message.success('更新成功');
      navigate(`/students/${studentId}`);
    },
    onError: () => {
      message.error('更新失败');
    },
  });

  const handleSubmit = async (values: any) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values as CreateStudentRequest);
    }
  };

  return (
    <div className="page-container max-w-5xl mx-auto">
      <div className="page-header flex items-center justify-between">
        <div>
          <Breadcrumb 
            items={[
              { title: '工作台', href: '/' },
              { title: '学生管理', href: '/students' },
              { title: isEdit ? '编辑学生' : '添加学生' }
            ]}
            className="mb-2"
          />
          <h1 className="page-title text-3xl font-bold flex items-center gap-3">
            <Button 
              icon={<ArrowLeftOutlined />} 
              type="text" 
              onClick={() => navigate(-1)}
              className="mr-2"
            />
            {isEdit ? '编辑学生信息' : '录入新学生'}
          </h1>
          <p className="page-description text-gray-500 text-lg">
            {isEdit ? `正在修改学生 ID: ${studentId} 的档案信息` : '请填写下方表单，为您的教学系统添加新的学生成员'}
          </p>
        </div>
      </div>

      <Card 
        variant="borderless" 
        className="shadow-xl rounded-2xl overflow-hidden border-t-4 border-indigo-500"
        styles={{ body: { padding: '40px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            midtermTarget: 75,
            knowledgeMastery: 60,
            homeworkCompletion: 85,
          }}
          requiredMark="optional"
        >
          <Row gutter={48}>
            <Col xs={24} lg={16}>
              {/* 基本信息部分 */}
              <div className="form-section mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <UserOutlined style={{ fontSize: '20px' }} />
                  </div>
                  <h3 className="text-xl font-semibold m-0">基本信息</h3>
                </div>

                <Row gutter={24}>
                  <Col span={24}>
                    <Form.Item
                      name="name"
                      label={<span className="font-medium text-gray-700">学生姓名</span>}
                      rules={[{ required: true, message: '请输入学生姓名' }]}
                    >
                      <Input 
                        prefix={<UserOutlined className="text-gray-400" />} 
                        placeholder="请输入真实姓名" 
                        size="large" 
                        className="rounded-lg h-12"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="grade"
                      label={<span className="font-medium text-gray-700">年级</span>}
                      rules={[{ required: true, message: '请选择年级' }]}
                    >
                      <Select 
                        placeholder="选择就读年级" 
                        size="large" 
                        className="rounded-lg h-12 w-full"
                        dropdownClassName="rounded-xl shadow-lg"
                      >
                        {GRADE_OPTIONS.map(g => (
                          <Select.Option key={g} value={g}>{g}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="currentSubject"
                      label={<span className="font-medium text-gray-700">当前科目</span>}
                      rules={[{ required: true, message: '请选择科目' }]}
                    >
                      <Select 
                        placeholder="选择辅导科目" 
                        size="large" 
                        className="rounded-lg h-12 w-full"
                        suffixIcon={<BookOutlined className="text-gray-400" />}
                      >
                        {SUBJECT_OPTIONS.map(s => (
                          <Select.Option key={s} value={s}>{s}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item 
                      name="school" 
                      label={<span className="font-medium text-gray-700">就读学校</span>}
                    >
                      <Input 
                        prefix={<EnvironmentOutlined className="text-gray-400" />} 
                        placeholder="请输入所在学校名称（可选）" 
                        size="large" 
                        className="rounded-lg h-12"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Divider className="my-8 opacity-50" />

              {/* 家长信息部分 */}
              <div className="form-section mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <PhoneOutlined style={{ fontSize: '20px' }} />
                  </div>
                  <h3 className="text-xl font-semibold m-0">家长联络</h3>
                </div>

                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item 
                      name="parentName" 
                      label={<span className="font-medium text-gray-700">家长姓名</span>}
                    >
                      <Input 
                        placeholder="请输入家长尊称" 
                        size="large" 
                        className="rounded-lg h-12"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="parentContact"
                      label={<span className="font-medium text-gray-700">联系手机</span>}
                      rules={[
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号码' }
                      ]}
                    >
                      <Input 
                        prefix={<PhoneOutlined className="text-gray-400" />}
                        placeholder="请输入家长手机号" 
                        size="large" 
                        className="rounded-lg h-12"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-full">
                <h4 className="text-lg font-bold mb-6 text-gray-800 border-b pb-3">学情与目标</h4>
                
                <Form.Item 
                  name="midtermTarget" 
                  label={<span className="font-medium text-gray-700">期中考试目标 (%)</span>}
                  rules={[{ type: 'number', min: 0, max: 100, message: '请输入 0-100 之间的数字' }]}
                >
                  <InputNumber min={0} max={100} size="large" className="w-full rounded-lg" placeholder="例如 75" />
                </Form.Item>

                <Form.Item 
                  name="knowledgeMastery" 
                  label={<span className="font-medium text-gray-700">知识点掌握度 (%)</span>}
                  rules={[{ type: 'number', min: 0, max: 100, message: '请输入 0-100 之间的数字' }]}
                >
                  <InputNumber min={0} max={100} size="large" className="w-full rounded-lg" placeholder="例如 60" />
                </Form.Item>

                <Form.Item 
                  name="homeworkCompletion" 
                  label={<span className="font-medium text-gray-700">作业完成率 (%)</span>}
                  rules={[{ type: 'number', min: 0, max: 100, message: '请输入 0-100 之间的数字' }]}
                >
                  <InputNumber min={0} max={100} size="large" className="w-full rounded-lg" placeholder="例如 85" />
                </Form.Item>

                <Divider className="my-6" />

                <h4 className="text-lg font-bold mb-6 text-gray-800 border-b pb-3">状态设置</h4>
                
                {isEdit ? (
                  <Form.Item 
                    name="status" 
                    label={<span className="font-medium text-gray-700">在学状态</span>}
                  >
                    <Select size="large" className="w-full">
                      <Select.Option value="active">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          在读
                        </span>
                      </Select.Option>
                      <Select.Option value="paused">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          暂停
                        </span>
                      </Select.Option>
                      <Select.Option value="finished">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          已结课
                        </span>
                      </Select.Option>
                    </Select>
                  </Form.Item>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                      <UserOutlined style={{ fontSize: '32px' }} />
                    </div>
                    <p className="text-gray-500 text-sm">
                      添加后，学生默认状态将设为「在读」。您之后可以在详情页进行调整。
                    </p>
                  </div>
                )}

                <div className="mt-12 space-y-4">
                  <Button 
                    type="primary" 
                    size="large" 
                    htmlType="submit" 
                    block 
                    icon={<SaveOutlined />}
                    loading={createMutation.isPending || updateMutation.isPending}
                    className="h-14 rounded-xl text-lg font-medium shadow-lg shadow-indigo-200"
                  >
                    {isEdit ? '确认保存修改' : '立即添加学生'}
                  </Button>
                  <Button 
                    size="large" 
                    block 
                    icon={<CloseOutlined />}
                    onClick={() => navigate(-1)}
                    className="h-14 rounded-xl text-lg font-medium border-gray-200 text-gray-600 hover:text-gray-800"
                  >
                    放弃返回
                  </Button>
                </div>

                <div className="mt-8 p-4 bg-white rounded-xl border border-dashed border-gray-300">
                  <h5 className="text-sm font-bold text-gray-500 mb-2">温馨提示</h5>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    录入信息后，系统将自动生成学生专属档案页。您可以后续补充学习报告、知识点掌握情况等详细数据。
                  </p>
                </div>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}
