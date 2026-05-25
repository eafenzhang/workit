import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import Knowledge from './pages/Knowledge';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import MCP from './pages/MCP';
import Model from './pages/Model';
import Messages from './pages/Messages';
import QuickCapture from './components/QuickCapture';
import ErrorBoundary from './components/ErrorBoundary';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';

function wrap(el: React.ReactNode) {
  return <ErrorBoundary><Index>{el}</Index></ErrorBoundary>;
}

function Hello() { return <div style={{padding:40,fontFamily:'monospace'}}>Hello World - 基础渲染正常</div>; }

const App = () => {
  const [quickCollectEnabled, setQuickCollectEnabled] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quick_collect_enabled');
      setQuickCollectEnabled(saved === 'true');
    } catch {}

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setQuickCollectEnabled(customEvent.detail.enabled);
    };
    window.addEventListener('quick-collect-toggle', handler);
    return () => window.removeEventListener('quick-collect-toggle', handler);
  }, []);

  return (
    <AuthProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={wrap(<Dashboard />)} />
        <Route path="/requirements" element={wrap(<Requirements />)} />
        <Route path="/knowledge" element={wrap(<Knowledge />)} />
        <Route path="/insights" element={wrap(<Insights />)} />
        <Route path="/mcp" element={wrap(<MCP />)} />
        <Route path="/model" element={wrap(<Model />)} />
        <Route path="/messages" element={wrap(<Messages />)} />
        <Route path="/settings" element={wrap(<Settings />)} />
      </Routes>
      <Toaster position="top-right" />
      {quickCollectEnabled && <QuickCapture />}
    </HashRouter>
    </AuthProvider>
  );
};

export default App;