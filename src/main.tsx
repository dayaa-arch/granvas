import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { createApplication } from '@/app/bootstrap/createApplication'
import './index.css'

const application = createApplication()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App application={application} />
  </StrictMode>,
)
