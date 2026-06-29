import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 自定义错误渲染 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React 错误边界组件
 * 捕获子组件渲染异常，防止整页白屏
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary 捕获到异常:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div style={{ padding: 24, background: '#fff1f0', borderRadius: 12, border: '1px solid #ffa39e' }}>
          <h3 style={{ color: '#cf1322', marginBottom: 12 }}>渲染异常（已被 ErrorBoundary 捕获）</h3>
          <div style={{ marginBottom: 8, fontWeight: 600, color: '#cf1322' }}>
            {this.state.error.name}: {this.state.error.message}
          </div>
          {this.state.error.stack && (
            <pre
              style={{
                fontSize: 12,
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                maxHeight: 300,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid #ffd6d6',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#5c0011' }}>组件堆栈</summary>
              <pre
                style={{
                  fontSize: 12,
                  background: '#fff',
                  padding: 12,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #ffd6d6',
                  marginTop: 8,
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.reset}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: '#1677ff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
