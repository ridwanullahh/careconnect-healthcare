import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initializeEmailEvents } from './lib/email-events'
import './lib/course-initializer'
// Initialize console manager FIRST to suppress console output in production
import './lib/console-manager'
// Load development console utilities
import './lib/dev-console'
import './index.css'
import App from './App.tsx'

// Initialize email notification system
initializeEmailEvents();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
