import { Component } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ManaLife UI error', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = /dynamically imported module|Loading chunk|Failed to fetch/i.test(String(this.state.error?.message))
    return (
      <div className="crash" role="alert">
        <span className="empty-icon">
          <TriangleAlert size={24} />
        </span>
        <h2>{chunk ? 'A new version is available' : 'Something went wrong here'}</h2>
        <p>{chunk ? 'Reload to get the latest ManaLife.' : 'This screen hit an unexpected problem. Your data is safe.'}</p>
        <button type="button" className="btn btn-primary btn-md" onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}>
          <RotateCcw size={16} /> <span>{chunk ? 'Reload' : 'Try again'}</span>
        </button>
      </div>
    )
  }
}
