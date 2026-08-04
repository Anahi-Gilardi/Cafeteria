import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in Castaño Resto Bar Component Tree:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4E8D7] text-[#2D0E13] flex items-center justify-center p-6">
          <div className="bg-[#FAF2E6] border-2 border-[#CFB5A0] rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="h-16 w-16 bg-[#F4DCDD] text-[#A63F45] rounded-2xl mx-auto flex items-center justify-center border border-[#A63F45]/30">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h2 className="font-serif text-2xl font-bold text-[#5C1D27]">
              Castaño — Resto Bar
            </h2>

            <p className="text-xs text-[#5E393F] font-medium leading-relaxed">
              Ocurrió un error inesperado al renderizar el módulo. El sistema ha protegido el resto de las funciones operativas del turno.
            </p>

            {this.state.error && (
              <div className="p-3 bg-[#EBDAC5]/50 border border-[#CFB5A0] rounded-xl text-[10px] font-mono text-[#2D0E13] text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-[#5C1D27] hover:bg-[#4A151D] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider"
              >
                <RefreshCw className="h-4 w-4" /> Reintentar Módulo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
