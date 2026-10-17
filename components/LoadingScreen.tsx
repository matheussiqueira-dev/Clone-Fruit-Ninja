import React, { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { CameraStatus } from '../types';

const SLOW_AFTER_MS = 10000;

const STEP_LABELS: Partial<Record<CameraStatus, string>> = {
  'loading-model': 'Carregando modelo da mão',
  requesting: 'Abrindo a câmera'
};

// Names the current step instead of a bare spinner; after 10 s it says the wait is expected (A.7 §13).
const LoadingScreen: React.FC<{ cameraStatus: CameraStatus }> = ({ cameraStatus }) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  const step = STEP_LABELS[cameraStatus] ?? 'Preparando a partida';

  return (
    <div className="ms-container flex w-full max-w-lg flex-1 items-center py-10">
      <section
        className="ms-card flex w-full flex-col gap-3"
        aria-labelledby="loading-title"
        aria-busy="true"
      >
        <h1 id="loading-title" className="text-h2 text-fg">
          Preparando a câmera
        </h1>
        <p className="flex items-center gap-2 text-body text-fg-secondary" role="status">
          <LoaderCircle size={16} strokeWidth={1.75} aria-hidden="true" className="ms-spinner" />
          {step}…
        </p>
        {cameraStatus === 'requesting' && (
          <p className="text-caption text-fg-secondary">Se o navegador perguntar, permita o uso da câmera.</p>
        )}
        {slow && (
          <p className="text-caption text-fg-secondary">
            Ainda carregando. Na primeira vez o modelo da mão pode levar alguns segundos.
          </p>
        )}
      </section>
    </div>
  );
};

export default LoadingScreen;
