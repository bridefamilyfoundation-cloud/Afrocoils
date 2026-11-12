import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import MembershipSync from './components/MembershipSync'
import RetiredGate from './components/RetiredGate'
import UpdatePrompt from './components/UpdatePrompt'
import './index.css'
import { HairProfileProvider } from './lib/profile-store'
import { initNativeShell } from './native/shell'

initNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HairProfileProvider>
      {/* The kill switch: a copy under the release floor gets one
          screen, the update, in place of the app. */}
      <RetiredGate>
        <App />
      </RetiredGate>
      {/* Outside the gate: a locked phone still gets updates and still
          finds out when its membership has been paid for. */}
      <UpdatePrompt />
      <MembershipSync />
    </HairProfileProvider>
  </StrictMode>,
)
