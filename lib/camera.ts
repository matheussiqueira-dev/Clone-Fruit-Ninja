import { CameraFailure, CameraStatus } from '../types';

const readErrorName = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const { name } = error;
    return typeof name === 'string' ? name : '';
  }
  return '';
};

// Maps getUserMedia / video start failures (DOMException names) to what the player can act on.
export const classifyCameraError = (error: unknown): CameraFailure => {
  switch (readErrorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'unavailable';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    case 'TimeoutError':
      return 'timeout';
    default:
      return 'error';
  }
};

export const CAMERA_FAILURE_MESSAGES: Record<CameraFailure, string> = {
  denied: 'A câmera foi bloqueada. Libere o acesso no ícone do cadeado ou jogue com o mouse.',
  unavailable: 'Nenhuma câmera encontrada. O modo mouse está disponível.',
  busy: 'A câmera está em uso por outro aplicativo. Feche-o e tente de novo, ou jogue com o mouse.',
  'model-error': 'Não foi possível carregar o modelo da mão. Verifique a conexão e tente de novo.',
  unsupported: 'Este navegador não dá acesso à câmera nesta página. O modo mouse está disponível.',
  timeout: 'A câmera não respondeu a tempo. Tente de novo ou jogue com o mouse.',
  error: 'Não foi possível abrir a câmera. Tente de novo ou jogue com o mouse.'
};

const FAILURE_STATUS_LABELS: Record<CameraFailure, string> = {
  denied: 'Câmera bloqueada no navegador',
  unavailable: 'Nenhuma câmera encontrada',
  busy: 'Câmera em uso por outro aplicativo',
  'model-error': 'Não foi possível carregar o modelo da mão',
  unsupported: 'Câmera indisponível neste navegador',
  timeout: 'A câmera não respondeu',
  error: 'Falha ao abrir a câmera'
};

export const getCameraStatusLabel = (status: CameraStatus, failure: CameraFailure | null): string => {
  if (status === 'error' && failure) return FAILURE_STATUS_LABELS[failure];
  if (status === 'loading-model') return 'Carregando modelo da mão';
  if (status === 'requesting') return 'Abrindo a câmera';
  if (status === 'ready') return 'Câmera pronta';
  return 'Câmera desligada';
};

export const isCameraBusy = (status: CameraStatus) => status === 'loading-model' || status === 'requesting';
