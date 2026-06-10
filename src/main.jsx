import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { LoginPage } from './ui/LoginPage.jsx'

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} }
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: '#1a0000', color: '#ff6b6b', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          <strong style={{ fontSize: 16 }}>Runtime Error</strong>{'\n\n'}
          {this.state.error?.message}{'\n\n'}
          {this.state.error?.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

// Inject Sora from Google Fonts
const soraLink = document.createElement('link');
soraLink.rel = 'stylesheet';
soraLink.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&family=Space+Grotesk:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap';
document.head.appendChild(soraLink);

// Reset browser defaults + Madefor font
const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'WixMadeforText';
    src: url('/fonts/madefor/WixMadeforText-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'WixMadeforText';
    src: url('/fonts/madefor/WixMadeforText-Medium.ttf') format('truetype');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'WixMadeforText';
    src: url('/fonts/madefor/WixMadeforText-SemiBold.ttf') format('truetype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'WixMadeforText';
    src: url('/fonts/madefor/WixMadeforText-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'WixMadeforDisplay';
    src: url('/fonts/madefor/WixMadeforDisplay-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'WixMadeforDisplay';
    src: url('/fonts/madefor/WixMadeforDisplay-ExtraBold.ttf') format('truetype');
    font-weight: 800;
    font-style: normal;
    font-display: swap;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; overflow: hidden; }
  body { background: #131315; font-family: 'WixMadeforText', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }

  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  input::placeholder { color: rgba(255,255,255,0.28); }
`;
document.head.appendChild(style);

function Root() {
  const isLoginRoute = typeof window !== 'undefined' && window.location.pathname === '/login';
  return isLoginRoute ? <LoginPage /> : <App />;
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
)
