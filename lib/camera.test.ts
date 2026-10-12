import { describe, expect, it } from 'vitest';
import { CAMERA_FAILURE_MESSAGES, classifyCameraError, getCameraStatusLabel } from './camera';

const domError = (name: string) => new DOMException('simulated', name);

describe('classifyCameraError', () => {
  it('separates denial, missing device and device in use', () => {
    expect(classifyCameraError(domError('NotAllowedError'))).toBe('denied');
    expect(classifyCameraError(domError('NotFoundError'))).toBe('unavailable');
    expect(classifyCameraError(domError('OverconstrainedError'))).toBe('unavailable');
    expect(classifyCameraError(domError('NotReadableError'))).toBe('busy');
    expect(classifyCameraError(domError('TimeoutError'))).toBe('timeout');
  });

  it('falls back to a generic failure for unknown or malformed errors', () => {
    expect(classifyCameraError(new Error('boom'))).toBe('error');
    expect(classifyCameraError(undefined)).toBe('error');
    expect(classifyCameraError(null)).toBe('error');
    expect(classifyCameraError('NotAllowedError')).toBe('error');
    expect(classifyCameraError({ name: 42 })).toBe('error');
    expect(classifyCameraError({ name: '' })).toBe('error');
  });

  it('accepts plain objects that carry a DOMException name', () => {
    expect(classifyCameraError({ name: 'NotAllowedError' })).toBe('denied');
  });

  it('gives each failure its own message', () => {
    const messages = Object.values(CAMERA_FAILURE_MESSAGES);
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe('getCameraStatusLabel', () => {
  it('describes loading steps and failures in words', () => {
    expect(getCameraStatusLabel('loading-model', null)).toBe('Carregando modelo da mão');
    expect(getCameraStatusLabel('requesting', null)).toBe('Abrindo a câmera');
    expect(getCameraStatusLabel('error', 'denied')).toBe('Câmera bloqueada no navegador');
    expect(getCameraStatusLabel('error', 'model-error')).toBe('Não foi possível carregar o modelo da mão');
    expect(getCameraStatusLabel('idle', null)).toBe('Câmera desligada');
    expect(getCameraStatusLabel('ready', null)).toBe('Câmera pronta');
  });

  it('never shows a failure label without a failure or outside the error status', () => {
    expect(getCameraStatusLabel('error', null)).toBe('Câmera desligada');
    expect(getCameraStatusLabel('ready', 'denied')).toBe('Câmera pronta');
  });
});
