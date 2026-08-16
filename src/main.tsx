import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { createApplication } from '@/app/bootstrap/createApplication'
import { resolveGranvasProjectLaunch } from '@/app/projectLaunch'
import './index.css'

const projectLaunch = resolveGranvasProjectLaunch(
  window.location.hash,
  () => window.crypto.randomUUID(),
)

if (
  projectLaunch.type === 'isolated-project' &&
  window.location.hash !== projectLaunch.canonicalHash
) {
  const canonicalUrl = new URL(window.location.href)
  canonicalUrl.hash = projectLaunch.canonicalHash
  window.history.replaceState(null, '', canonicalUrl)
}

const application = createApplication({
  ...(projectLaunch.type === 'isolated-project' ? { projectLaunch } : {}),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App application={application} />
  </StrictMode>,
)
