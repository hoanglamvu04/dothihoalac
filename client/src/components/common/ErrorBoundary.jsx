import { Component } from 'react';
import { reportClientError } from '../../utils/telemetry';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      failed: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      failed: true,
    };
  }

  componentDidCatch(error, info) {
    void reportClientError(error, {
      kind: 'react.error-boundary',
      componentStack:
        info?.componentStack || '',
    });
  }

  render() {
    if (this.state.failed) {
      return (
        <main
          style={{
            minHeight: '65vh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
          }}
        >
          <section
            style={{
              width: 'min(520px, 100%)',
              border: '1px solid #dfe8e2',
              borderRadius: '18px',
              background: '#fff',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                margin: '0 0 10px',
                fontSize: '24px',
              }}
            >
              Trang gặp sự cố ngoài dự kiến
            </h1>
            <p
              style={{
                margin: '0 0 18px',
                color: '#647168',
                lineHeight: 1.6,
              }}
            >
              Hệ thống đã ghi nhận lỗi để quản trị viên kiểm tra.
              Bạn có thể tải lại trang để tiếp tục.
            </p>
            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              style={{
                minHeight: '42px',
                border: 0,
                borderRadius: '10px',
                background: '#103323',
                padding: '0 18px',
                color: '#fff',
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              Tải lại trang
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
