using UnityEngine;

namespace FruitNinjaClone.CameraSystem
{
    public class CameraImpulseController : MonoBehaviour
    {
        public Camera targetCamera;

        [Header("Slow Mo Zoom")]
        public float slowMoZoom = 0.92f;
        public float zoomLerpSpeed = 8f;

        [Header("Shake")]
        public float shakeDuration = 0.12f;
        public float shakeAmplitude = 0.2f;
        public float shakeFrequency = 24f;

        private Vector3 basePosition;
        private float baseOrthoSize;
        private float baseFov;
        private float slowMoBlend;
        private float shakeTimer;
        private float shakeIntensity;

        private void Awake()
        {
            if (targetCamera == null)
            {
                targetCamera = Camera.main;
            }

            if (targetCamera != null)
            {
                basePosition = targetCamera.transform.position;
                baseOrthoSize = targetCamera.orthographicSize;
                baseFov = targetCamera.fieldOfView;
            }
        }

        public void SetSlowMoBlend(float blend)
        {
            slowMoBlend = Mathf.Clamp01(blend);
        }

        public void AddImpulse(float intensity)
        {
            shakeIntensity = Mathf.Clamp01(shakeIntensity + intensity);
            shakeTimer = Mathf.Max(shakeTimer, shakeDuration);
        }

        private void LateUpdate()
        {
            if (targetCamera == null)
            {
                return;
            }

            UpdateZoom();
            UpdateShake();
        }

        private void UpdateZoom()
        {
            float zoomTarget = Mathf.Lerp(1f, slowMoZoom, slowMoBlend);
            if (targetCamera.orthographic)
            {
                float targetSize = baseOrthoSize * zoomTarget;
                targetCamera.orthographicSize = Mathf.Lerp(targetCamera.orthographicSize, targetSize, Time.unscaledDeltaTime * zoomLerpSpeed);
            }
            else
            {
                float targetFov = baseFov * zoomTarget;
                targetCamera.fieldOfView = Mathf.Lerp(targetCamera.fieldOfView, targetFov, Time.unscaledDeltaTime * zoomLerpSpeed);
            }
        }

        private void UpdateShake()
        {
            Vector3 offset = Vector3.zero;
            if (shakeTimer > 0f)
            {
                shakeTimer -= Time.unscaledDeltaTime;
                float noiseX = (Mathf.PerlinNoise(0f, Time.unscaledTime * shakeFrequency) - 0.5f) * 2f;
                float noiseY = (Mathf.PerlinNoise(1f, Time.unscaledTime * shakeFrequency) - 0.5f) * 2f;
                offset = new Vector3(noiseX, noiseY, 0f) * shakeAmplitude * shakeIntensity;
                if (shakeTimer <= 0f)
                {
                    shakeIntensity = 0f;
                }
            }

            targetCamera.transform.position = basePosition + offset;
        }
    }
}
