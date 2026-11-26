import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { StoreProvider } from './store'
import './styles.css'
import './design.css'

document.body.classList.add('redesign')

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ErrorBoundary>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ErrorBoundary>
  </BrowserRouter>,
)
