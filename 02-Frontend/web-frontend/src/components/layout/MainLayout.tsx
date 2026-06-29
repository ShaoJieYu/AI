import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Drawer } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BookOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  CameraOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/students', icon: <UserOutlined />, label: '学生管理' },
  { key: '/lessons/new', icon: <BookOutlined />, label: '新建备课' },
  { key: '/lessons/history', icon: <FileTextOutlined />, label: '备课历史' },
  { key: '/homework', icon: <CameraOutlined />, label: '错题拍照解析' },
  { key: '/agent/demo', icon: <RobotOutlined />, label: 'Agent智能备课' },
  { key: '/agent/multi', icon: <RobotOutlined />, label: '多Agent协作' },
  { key: '/resources', icon: <BarChartOutlined />, label: '教学资源' },
  { key: '/progress', icon: <BarChartOutlined />, label: '教学进度' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        className="!bg-white shadow-xl z-10 h-screen overflow-hidden"
      >
        <div className={`h-20 flex items-center justify-center border-b overflow-hidden transition-all duration-300 ${collapsed ? 'px-2' : 'px-6'}`}>
          <span 
            className={`text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-500 bg-clip-text text-transparent transition-all duration-300 inline-block whitespace-nowrap ${
              collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
            }`}
          >
            智能备课平台
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-0 h-[calc(100vh-80px)] py-4"
        />
      </Sider>

      <Layout className="flex flex-col h-screen overflow-hidden">
        <Header className="!bg-white !px-6 flex items-center justify-between shadow-sm !h-20 border-b shrink-0 z-20">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: '20px' }} /> : <MenuFoldOutlined style={{ fontSize: '20px' }} />}
              onClick={() => setCollapsed(!collapsed)}
              className="mr-6 flex items-center justify-center"
              size="large"
            />
          </div>

          <div className="flex items-center gap-6">
            <Badge count={3} size="default" offset={[-2, 2]}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: '22px' }} />} size="large" />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                size={48}
                src={user?.avatar || '/assets/default-avatar.png'}
                className="cursor-pointer border-2 border-primary-100 transition-transform hover:scale-105"
              />
            </Dropdown>
          </div>
        </Header>

        <Content className="!bg-gray-50 p-6 overflow-auto flex-1">
          <Outlet />
        </Content>
      </Layout>

      <Drawer
        title="导航菜单"
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>
    </Layout>
  );
}
