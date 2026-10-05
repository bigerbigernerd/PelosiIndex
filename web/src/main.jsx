import {createRoot} from 'react-dom/client';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './styles.css';
import {App} from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
