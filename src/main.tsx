import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/shippori-mincho/500.css'
import '@fontsource/shippori-mincho/600.css'
import '@fontsource/noto-serif-jp/500.css'
import './styles/tokens.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LocaleProvider } from './i18n/LocaleContext'
import { startUrlSync } from './store/urlSync'

startUrlSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
