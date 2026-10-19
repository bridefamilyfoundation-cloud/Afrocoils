import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import UpdatePrompt from './components/UpdatePrompt'
import './index.css'
import { HairProfileProvider } from './lib/profile-store'
import { initNativeShell } from './native/shell'

initNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HairProfileProvider>
      <App />
      <UpdatePrompt />
    </HairProfileProvider>
  </StrictMode>,
)
