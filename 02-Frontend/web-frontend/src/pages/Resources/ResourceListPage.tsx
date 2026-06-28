import { useState } from 'react';
import { Card, Input, Select, Tabs, Empty } from 'antd';
import { SearchOutlined, BookOutlined, FileTextOutlined, BarChartOutlined } from '@ant-design/icons';
const { Search } = Input;

export default function ResourceListPage() {
  const [activeTab, setActiveTab] = useState('knowledge');

  const tabItems = [
    {
      key: 'knowledge',
      label: (
        <span>
          <BookOutlined className="mr-1" />
          知识点库
        </span>
      ),
    },
    {
      key: 'template',
      label: (
        <span>
          <FileTextOutlined className="mr-1" />
          教学模板
        </span>
      ),
    },
    {
      key: 'exercise',
      label: (
        <span>
          <BarChartOutlined className="mr-1" />
          题型库
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">教学资源</h1>
        <p className="page-description">浏览和搜索知识点、模板和题型</p>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <div className="flex gap-4 mb-6">
          <Search
            placeholder="搜索知识点、模板、题型..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            className="flex-1"
            onSearch={(value) => console.log('Search', value)}
          />
          <Select
            placeholder="选择年级"
            className="w-32"
            allowClear
            options={[
              { label: '初一', value: '初一' },
              { label: '初二', value: '初二' },
              { label: '初三', value: '初三' },
              { label: '高一', value: '高一' },
              { label: '高二', value: '高二' },
              { label: '高三', value: '高三' },
            ]}
          />
          <Select
            placeholder="选择科目"
            className="w-32"
            allowClear
            options={[
              { label: '数学', value: '数学' },
              { label: '物理', value: '物理' },
              { label: '化学', value: '化学' },
              { label: '英语', value: '英语' },
              { label: '语文', value: '语文' },
            ]}
          />
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <div className="py-12">
          <Empty
            description={
              <span className="text-gray-500">
                {activeTab === 'knowledge' && '知识点库功能开发中...'}
                {activeTab === 'template' && '教学模板功能开发中...'}
                {activeTab === 'exercise' && '题型库功能开发中...'}
              </span>
            }
          />
        </div>
      </Card>
    </div>
  );
}
