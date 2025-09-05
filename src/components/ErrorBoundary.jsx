import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        // You can also log error to an error reporting service here
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <h2>문제가 발생했습니다</h2>
                        <p>애플리케이션에서 예상치 못한 오류가 발생했습니다.</p>
                        
                        {process.env.NODE_ENV === 'development' && (
                            <details className="error-details">
                                <summary>오류 세부 정보 (개발 모드)</summary>
                                <div className="error-stack">
                                    <strong>오류:</strong> {this.state.error && this.state.error.toString()}
                                    <br />
                                    <strong>스택 트레이스:</strong>
                                    <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                                </div>
                            </details>
                        )}
                        
                        <div className="error-actions">
                            <button 
                                onClick={() => window.location.reload()} 
                                className="form-button"
                            >
                                페이지 새로고침
                            </button>
                            <button 
                                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
                                className="form-button"
                            >
                                다시 시도
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;