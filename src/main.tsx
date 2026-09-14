import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/theme-neutral/theme.css';
import './styles.css';
import './templates/login-split/login-split.css';
import './templates/sidebar/sidebar.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
