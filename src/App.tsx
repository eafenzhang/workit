import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { useState, useEffect } from 'react';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index><Dashboard /></Index>} />
        <Route path="/requirements" element={<Index><Requirements /></Index>} />
        <Route path="/knowledge" element={<Index><Knowledge /></Index>} />
        <Route path="/insights" element={<Index><Insights /></Index>} />
        <Route path="/mcp" element={<Index><MCP /></Index>} />
        <Route path="/model" element={<Index><Model /></Index>} />
        <Route path="/messages" element={<Index><Messages /></Index>} />
        <Route path="/settings" element={<Index><Settings /></Index>} />
      </Routes>
      <Toaster position="top-right" />
      {quickCollectEnabled && <QuickCapture />}
    </BrowserRouter>
  );
};

export default App;