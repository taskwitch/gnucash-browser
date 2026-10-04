import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { BookProvider } from './state/book-context.tsx'
import './theme.css'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BookProvider>
      <App />
    </BookProvider>
  </StrictMode>,
)
