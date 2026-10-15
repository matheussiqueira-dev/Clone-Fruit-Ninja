// Single place where unexpected errors are reported. Today it logs a structured entry;
// a monitoring service (e.g. Sentry) would plug in here without touching callers.
export type ErrorSource = 'render' | 'window' | 'promise';

export interface ErrorReport {
  source: ErrorSource;
  message: string;
  stack?: string;
  at: string;
}

export const toErrorReport = (source: ErrorSource, error: unknown, now: Date = new Date()): ErrorReport => {
  if (error instanceof Error) {
    return { source, message: error.message || error.name, stack: error.stack, at: now.toISOString() };
  }
  return { source, message: typeof error === 'string' ? error : 'Erro desconhecido', at: now.toISOString() };
};

export const reportError = (source: ErrorSource, error: unknown) => {
  console.error('[shadow-dojo]', toErrorReport(source, error));
};

// Catches what React's error boundary cannot: errors in event handlers, timers and promises.
export const installGlobalErrorReporting = () => {
  window.addEventListener('error', (event) => reportError('window', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => reportError('promise', event.reason));
};
