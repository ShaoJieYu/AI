import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 是否启用 LaTeX 公式渲染，默认 true；非理科（英语/语文等）传 false 避免误把 $ 当公式 */
  enableMath?: boolean;
}

/**
 * Markdown 渲染组件
 * 支持 GFM（表格、删除线、任务列表）、数学公式（KaTeX）
 * 用于展示 AI 生成的五段式备课内容
 */
function MarkdownRendererBase({ content, className = '', enableMath = true }: MarkdownRendererProps) {
  const remarkPlugins = enableMath ? [remarkGfm, remarkMath] : [remarkGfm];
  const rehypePlugins = enableMath ? [rehypeKatex] : [];
  return (
    <div className={`markdown-body text-gray-800 leading-7 ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 border-l-4 border-primary-500 pl-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold mt-5 mb-2 text-gray-900" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-semibold mt-4 mb-2 text-gray-900" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-3 text-[15px]" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-[15px] leading-7" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-4 pl-4 py-2 border-l-4 border-amber-400 bg-amber-50 text-gray-700 rounded-r"
              {...props}
            />
          ),
          code: ({ className: codeClassName, children, ...props }: any) => {
            // 带 language- 前缀的是代码块，否则是行内代码
            const isBlock = /language-/.test(codeClassName || '');
            if (isBlock) {
              return (
                <code
                  className="block bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono leading-6"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => <>{props.children}</>,
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-100" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 px-3 py-2 align-top" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary-600 underline hover:text-primary-700" target="_blank" rel="noreferrer" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-200" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}

const MarkdownRenderer = memo(MarkdownRendererBase);
export default MarkdownRenderer;
