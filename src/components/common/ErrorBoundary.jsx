import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 詳細なエラーログ（将来的にSentry等へ送信することを想定）
        const errorLog = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            url: window.location.href,
            pathname: window.location.pathname,
            timestamp: new Date().toISOString(),
            // ログインユーザー情報が必要な場合はここに追加
        };

        console.error("[ErrorBoundary] Caught an exception:", errorLog);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '30px 20px',
                    margin: '10px 0',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '16px',
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '5px' }}>⚠️</div>
                    <p style={{ fontWeight: 'bold', color: '#f87171', margin: 0 }}>
                        表示中にエラーが発生したのだ...
                    </p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0 }}>
                        データが正常に読み込めなかった可能性があるのだ。
                    </p>
                    <button 
                        onClick={() => {
                            if (this.props.onReset) this.props.onReset();
                            this.setState({ hasError: false, error: null });
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '6px 16px',
                            borderRadius: '50px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    >
                        再試行する
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

