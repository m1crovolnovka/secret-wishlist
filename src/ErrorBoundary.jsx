import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="boot-screen">
          <h1>Тайно</h1>
          <p>Что-то сломалось при отрисовке.</p>
          <p className="muted">{this.state.error.message || String(this.state.error)}</p>
          <button className="fill" type="button" onClick={() => window.location.reload()}>
            обновить
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
