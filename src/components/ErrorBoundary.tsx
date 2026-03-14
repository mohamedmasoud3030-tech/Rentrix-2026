/** @ts-ignore */
// Added to suppress TypeScript errors for missing type declarations

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ error });
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center text-slate-800">
          <h1 className="text-xl font-extrabold">حدث خطأ أثناء عرض الصفحة</h1>
          <p className="text-sm text-slate-600">جرّب إعادة تحميل الصفحة أو الرجوع للوحة الرئيسية.</p>
          {this.state.error?.message && (
            <pre className="max-w-xl rounded-xl bg-white p-3 text-left text-xs text-slate-700 shadow-sm">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              إعادة التحميل
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '#/')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
