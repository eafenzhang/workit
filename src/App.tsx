import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from './pages/Index';
import QuickCapture from './components/QuickCapture';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { useState, useEffect } from 'react';

const App = () => {
  const isQCPopup = window.location.hash === '#qc-popup';

  if (isQCPopup) {
    return (
      <AuthProvider>
        <ErrorBoundary label="QC">
          <QuickCapture />
        </ErrorBoundary>
      </AuthProvider>
    );
  }

  const [quickCollectEnabled, setQuickCollectEnabled] = useState(false);

  useEffect(() => {
    try { setQuickCollectEnabled(localStorage.getItem('quick_collect_enabled') === 'true'); } catch {}
    const handler = (e: Event) => setQuickCollectEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    window.addEventListener('quick-collect-toggle', handler);
    return () => window.removeEventListener('quick-collect-toggle', handler);
  }, []);

  return (
    <AuthProvider>
      <MemoryRouter>
        <ErrorBoundary label="App">
          <Index />
        </ErrorBoundary>
        <Toaster position="top-right" />
        {quickCollectEnabled && <QuickCapture />}
      </MemoryRouter>
    </AuthProvider>
  );
};

export default App;