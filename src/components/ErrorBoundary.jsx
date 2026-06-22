import { Component } from 'react'

/**
 * Catches render errors anywhere below it in the tree and shows a friendly
 * recovery screen instead of a blank white page. This is the safety net for
 * production — without it, any unhandled error (bad data shape, network
 * hiccup mid-render, etc.) silently blanks the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production this is where you'd forward to an error-tracking service
    console.error('Homespot render error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#13131F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🛠️</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#fff', fontWeight: 700, marginBottom: 10 }}>
              Something went sideways
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 24 }}>
              Homespot hit a snag loading this page. Refreshing usually fixes it.
            </div>
            <button
              onClick={this.handleReload}
              style={{
                background: '#F5A623',
                border: 'none',
                borderRadius: 14,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                color: '#13131F',
                cursor: 'pointer',
              }}
            >
              Reload Homespot
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
