import { useState, useRef } from 'react';
import { Card, Upload, Button, App, Spin, Typography, Empty, Modal } from 'antd';
import { InboxOutlined, FileImageOutlined, FilePdfOutlined, CheckCircleOutlined, BulbOutlined, BookOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { homeworkApi } from '@/api/homework';
import type { HomeworkAnalysisRecord } from '@/types/homework';

const { Title } = Typography;

const formatText = (text: string) => {
  if (!text) return '';
  // Remove any remaining '#' symbols to ensure they never display
  const cleaned = text.replace(/#/g, '');
  const escaped = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #111827;">$1</strong>');
};

export default function HomeworkUploadPage() {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<HomeworkAnalysisRecord | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview && !file.thumbUrl && file.originFileObj) {
      file.preview = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as File);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    }
    setPreviewImage(file.thumbUrl || file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || '图片预览');
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleUploadChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    const updatedList = newFileList.map(file => {
      if (file.originFileObj) {
        if (!file.thumbUrl) {
          file.thumbUrl = URL.createObjectURL(file.originFileObj);
        }
        file.status = 'done'; // Set done status to apply completed preview styling
      }
      return file;
    });
    setFileList(updatedList);
  };

  const handleRemove = (file: UploadFile) => {
    setFileList(fileList.filter((item) => item.uid !== file.uid));
  };

  const handleAnalyze = async () => {
    if (fileList.length === 0) {
      message.warning('请至少上传一张作业图片');
      return;
    }

    const files = fileList
      .map((file) => file.originFileObj)
      .filter(Boolean) as File[];

    try {
      setAnalyzing(true);
      const record = await homeworkApi.analyzeHomework(files);
      setResult(record);
      message.success('错题分析完成');
    } catch (error: any) {
      message.error(error.response?.data?.message || '分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFileList([]);
    setResult(null);
  };

  const handleExportPDF = async () => {
    if (!resultRef.current || !result) {
      message.warning('暂无分析结果可导出');
      return;
    }

    try {
      setExporting(true);
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `错题分析报告_${result.id || Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(resultRef.current).save();
      
      if (result.id) {
        try {
          await homeworkApi.savePdfUrl(result.id, `local_download_${opt.filename}`);
        } catch (saveError) {
          console.error('Failed to save PDF URL to backend:', saveError);
        }
      }
      message.success('PDF 导出成功');
    } catch (error) {
      console.error('PDF export error:', error);
      message.error('导出 PDF 失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Stylesheet for empty upload container state */}
      <style>{`
        .empty-upload.ant-upload-wrapper .ant-upload-select {
          width: 100% !important;
          height: 180px !important;
          background-color: #f9fafb !important;
          border: 2px dashed #cbd5e1 !important;
          border-radius: 12px !important;
          margin-bottom: 0px !important;
        }
        .empty-upload.ant-upload-wrapper .ant-upload-select:hover {
          border-color: #6366f1 !important;
        }
        .empty-upload.ant-upload-wrapper .ant-upload-drag-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }
        .has-files.ant-upload-wrapper .ant-upload-select,
        .has-files.ant-upload-wrapper .ant-upload-list-item,
        .has-files.ant-upload-wrapper .ant-upload-list-item-container {
          width: 180px !important;
          height: 180px !important;
          border-radius: 12px !important;
        }
      `}</style>
      <Card title="错题上传与分析" className="shadow-sm border-none rounded-xl">
        <Upload
          name="images"
          multiple
          listType="picture-card"
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleUploadChange}
          onRemove={handleRemove}
          onPreview={handlePreview}
          accept="image/*"
          className={fileList.length === 0 ? "empty-upload mb-6" : "has-files mb-6"}
        >
          {fileList.length === 0 ? (
            <div className="ant-upload-drag-container" style={{ padding: '24px', textAlign: 'center' }}>
              <p className="ant-upload-drag-icon" style={{ marginBottom: '12px' }}>
                <InboxOutlined style={{ fontSize: '36px', color: '#6366F1' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: '15px', fontWeight: 500, color: '#374151', margin: 0 }}>
                点击或拖拽作业图片到此处上传
              </p>
              <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', margin: 0 }}>
                支持多张图片，建议上传清晰的作业照片
              </p>
            </div>
          ) : (
            <div>
              <PlusOutlined style={{ fontSize: '24px', color: '#6366F1' }} />
              <div style={{ marginTop: '8px', color: '#4b5563', fontSize: '13px' }}>继续上传</div>
            </div>
          )}
        </Upload>

        <div className="flex gap-4">
          <Button
            type="primary"
            size="large"
            onClick={handleAnalyze}
            loading={analyzing}
            disabled={fileList.length === 0}
            className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-500 border-none"
          >
            开始分析
          </Button>
          <Button 
            size="large" 
            onClick={handleReset} 
            disabled={fileList.length === 0 && !result}
            className="rounded-full px-6"
          >
            重置
          </Button>
        </div>
      </Card>

      {analyzing && (
        <Card className="shadow-sm border-none rounded-xl flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">AI 正在全力以赴分析图片中，这可能需要几十秒时间...</p>
        </Card>
      )}

      {result && !analyzing && (
        <div className="space-y-6">
          <div className="flex justify-end px-2">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exporting}
              size="large"
              className="bg-red-500 hover:bg-red-600 border-none rounded-full px-6 shadow-md"
            >
              导出专属 PDF
            </Button>
          </div>

          <motion.div 
            ref={resultRef} 
            className="bg-white p-8 rounded-2xl shadow-md print:shadow-none border border-gray-100"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ backgroundColor: '#ffffff' }}
          >
            <style>{`
              .ant-card {
                page-break-inside: auto !important;
                break-inside: auto !important;
              }
              .ant-card-body {
                page-break-inside: auto !important;
                break-inside: auto !important;
              }
              p, li, .step-item, h3, h4, h5 {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .section-header {
                page-break-after: avoid !important;
                break-after: avoid-page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            `}</style>
            <div className="text-center mb-8 border-b pb-6" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '24px', marginBottom: '32px' }}>
              <Title level={2} style={{ color: '#1f2937', marginBottom: '8px', fontWeight: 800 }}>作业错题智能分析报告</Title>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>生成时间: {dayjs().format('YYYY-MM-DD HH:mm')}</div>
            </div>

            <motion.div variants={itemVariants} className="mb-8" style={{ marginBottom: '32px' }}>
              <div className="flex items-center mb-4 section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '8px', marginRight: '12px', display: 'inline-flex', alignItems: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: '20px' }} />
                </span>
                <Title level={4} style={{ margin: 0, color: '#1f2937', fontWeight: 700 }}>错题回顾</Title>
              </div>
              <Card style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0', borderTop: 0, borderBottom: 0, borderRight: 0 }} className="border-y-0 border-r-0">
                <div 
                  style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-wrap' }} 
                  dangerouslySetInnerHTML={{ __html: formatText(result.wrongQuestions) }} 
                />
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-8" style={{ marginBottom: '32px' }}>
              <div className="flex items-center mb-4 section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#ffedd5', color: '#f97316', padding: '8px', borderRadius: '8px', marginRight: '12px', display: 'inline-flex', alignItems: 'center' }}>
                  <BulbOutlined style={{ fontSize: '20px' }} />
                </span>
                <Title level={4} style={{ margin: 0, color: '#1f2937', fontWeight: 700 }}>错误原因深度剖析</Title>
              </div>
              <Card style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316', borderRadius: '0 8px 8px 0', borderTop: 0, borderBottom: 0, borderRight: 0 }} className="border-y-0 border-r-0">
                <div 
                  style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }} 
                  dangerouslySetInnerHTML={{ __html: formatText(result.errorAnalysis) }} 
                />
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-8" style={{ marginBottom: '32px' }}>
              <div className="flex items-center mb-4 section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#dbeafe', color: '#3b82f6', padding: '8px', borderRadius: '8px', marginRight: '12px', display: 'inline-flex', alignItems: 'center' }}>
                  <BookOutlined style={{ fontSize: '20px' }} />
                </span>
                <Title level={4} style={{ margin: 0, color: '#1f2937', fontWeight: 700 }}>核心知识点详解</Title>
              </div>
              <Card style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', borderTop: 0, borderBottom: 0, borderRight: 0 }} className="border-y-0 border-r-0">
                <div 
                  style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }} 
                  dangerouslySetInnerHTML={{ __html: formatText(result.knowledgePoints) }} 
                />
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-8" style={{ marginBottom: '32px' }}>
              <div className="flex items-center mb-4 section-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ backgroundColor: '#dcfce7', color: '#22c55e', padding: '8px', borderRadius: '8px', marginRight: '12px', display: 'inline-flex', alignItems: 'center' }}>
                  <BookOutlined style={{ fontSize: '20px' }} />
                </span>
                <Title level={4} style={{ margin: 0, color: '#1f2937', fontWeight: 700 }}>巩固建议与练习</Title>
              </div>
              <Card style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '0 8px 8px 0', borderTop: 0, borderBottom: 0, borderRight: 0 }} className="border-y-0 border-r-0">
                <div 
                  style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }} 
                  dangerouslySetInnerHTML={{ __html: formatText(result.suggestions) }} 
                />
              </Card>
            </motion.div>
          </motion.div>
        </div>
      )}

      {!result && !analyzing && (
        <Card className="shadow-sm border-none rounded-xl">
          <Empty
            image={<FileImageOutlined className="text-6xl text-gray-300" />}
            description="上传作业图片后，AI 将自动识别并分析错题"
          />
        </Card>
      )}
      <Modal 
        open={previewOpen} 
        title={previewTitle} 
        footer={null} 
        onCancel={() => setPreviewOpen(false)}
        styles={{ mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' } }}
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      >
        <img alt="预览图片" style={{ width: '100%', borderRadius: '8px' }} src={previewImage} />
      </Modal>
    </div>
  );
}
