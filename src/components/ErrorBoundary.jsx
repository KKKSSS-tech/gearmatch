import { Component } from 'react'

// 予期せぬ実行時エラーで真っ白になるのを防ぐ“最後の砦”。
// 子コンポーネントが投げた例外を捕まえ、再読み込みできる案内を出す（日英併記の静的文言）。
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // 開発時はコンソールに詳細を出す（本番は外部ログに送る拡張余地）
    if (import.meta.env && import.meta.env.DEV) {
      console.error('Unhandled UI error:', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: '32rem',
            margin: '15vh auto',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#1d1d1f',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            問題が発生しました / Something went wrong
          </h1>
          <p style={{ color: '#515154', fontSize: '0.95rem', lineHeight: 1.6 }}>
            一時的なエラーのようです。ページを再読み込みしてみてください。
            <br />
            This looks like a temporary error. Please reload the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.25rem',
              padding: '0.7rem 1.4rem',
              background: '#0071e3',
              color: '#fff',
              border: 'none',
              borderRadius: '0.6rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            再読み込み / Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
