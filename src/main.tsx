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

// Handle stale chunk dynamic import failures automatically when a new version is deployed
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason &&
    typeof event.reason.message === "string" &&
    (event.reason.message.includes("Failed to fetch dynamically imported module") ||
     event.reason.message.includes("Importing a module script failed"))
  ) {
    window.location.reload();
  }
});

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
    if (
      error.message &&
      (error.message.includes("Failed to fetch dynamically imported module") ||
       error.message.includes("Importing a module script failed"))
    ) {
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4E8D7] flex items-center justify-center p-6 text-[#2D0E13]">
          <div className="bg-[#FAF2E6] border border-[#CFB5A0] rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-4">
            <div className="text-4xl">☕</div>
            <h2 className="font-serif text-2xl font-bold text-[#5C1D27]">Castaño — Resto Bar</h2>
            <p className="text-xs text-[#5E393F] font-medium">
              Se ha producido un inconveniente temporal al cargar la interfaz.
            </p>
            <div className="p-3 bg-[#EBDAC5]/40 border border-[#CFB5A0] rounded-2xl text-[10px] font-mono text-[#5C1D27] break-all text-left">
              {this.state.error?.message || "Error de inicialización"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#5C1D27] hover:bg-[#4A151D] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all cursor-pointer"
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

