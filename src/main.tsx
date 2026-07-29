import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error caught by App ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F3E7DB] flex items-center justify-center p-6 text-[#332424]">
          <div className="bg-[#FFF9F4] border border-[#D7BBA8] rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-4">
            <div className="text-4xl">☕</div>
            <h2 className="font-serif text-2xl font-bold text-[#843747]">Castaño — Resto Bar</h2>
            <p className="text-xs text-[#6F5A55] font-medium">
              Se ha producido un inconveniente temporal al cargar la interfaz.
            </p>
            <div className="p-3 bg-[#E8D4C3]/40 border border-[#D7BBA8] rounded-2xl text-[10px] font-mono text-[#843747] break-all text-left">
              {this.state.error?.message || "Error de inicialización"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#843747] hover:bg-[#71303D] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              🔄 Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

