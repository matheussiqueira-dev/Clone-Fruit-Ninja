import React from 'react';
import { CircleAlert } from 'lucide-react';
import { reportError } from '../lib/errors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

// Last line of defence for render errors: the page keeps its shell and offers a way out
// instead of going blank (A.7 §8: say what happened and what to do).
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError('render', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main id="main-content" className="ms-container flex min-h-dvh items-center py-10">
        <div className="ms-alert w-full max-w-[32rem]" role="alert">
          <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="ms-alert__icon" />
          <div>
            <h1 className="text-body font-semibold text-fg">O jogo parou de responder.</h1>
            <p className="text-caption text-fg-secondary">
              Um erro inesperado interrompeu a página. Seus resultados salvos continuam neste navegador.
            </p>
            <button
              type="button"
              className="ms-btn ms-btn--primary mt-3"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
