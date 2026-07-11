import React from 'react';
import { Result, Button } from 'antd';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  unknownError?: string;
  retryText?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title={this.props.title ?? '页面发生错误'}
          subTitle={this.state.error?.message || this.props.unknownError || '未知错误'}
          extra={
            <Button type="primary" onClick={this.handleRetry}>
              {this.props.retryText ?? '重试'}
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
