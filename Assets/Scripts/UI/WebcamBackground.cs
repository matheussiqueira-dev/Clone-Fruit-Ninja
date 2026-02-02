using UnityEngine;
using UnityEngine.UI;

namespace FruitNinjaClone.UI
{
    public class WebcamBackground : MonoBehaviour
    {
        [Header("Target")]
        public RawImage rawImage;
        public Renderer targetRenderer;

        [Header("Device")]
        public int deviceIndex;
        public bool autoStart = true;
        public bool mirrorHorizontal = true;
        public bool mirrorVertical;

        [Header("Quality")]
        public int requestedWidth = 1280;
        public int requestedHeight = 720;
        public int requestedFPS = 30;
        public FilterMode filterMode = FilterMode.Bilinear;

        [Header("Fill")]
        public bool fillScreen = true;

        private WebCamTexture webcam;
        private RectTransform rawRect;
        private bool isPlaying;

        private void Awake()
        {
            if (rawImage == null)
            {
                rawImage = GetComponent<RawImage>();
            }
            if (rawImage != null)
            {
                rawRect = rawImage.rectTransform;
            }
        }

        private void OnEnable()
        {
            if (autoStart)
            {
                StartCamera();
            }
        }

        private void OnDisable()
        {
            StopCamera();
        }

        private void Update()
        {
            if (webcam == null || !webcam.isPlaying)
            {
                return;
            }

            ApplyOrientation();
        }

        public void StartCamera()
        {
            if (isPlaying)
            {
                return;
            }

            WebCamDevice[] devices = WebCamTexture.devices;
            if (devices == null || devices.Length == 0)
            {
                return;
            }

            int index = Mathf.Clamp(deviceIndex, 0, devices.Length - 1);
            string name = devices[index].name;
            webcam = new WebCamTexture(name, requestedWidth, requestedHeight, requestedFPS);
            webcam.filterMode = filterMode;
            webcam.Play();
            isPlaying = true;

            if (rawImage != null)
            {
                rawImage.texture = webcam;
            }
            if (targetRenderer != null)
            {
                targetRenderer.material.mainTexture = webcam;
            }

            ApplyOrientation();
        }

        public void StopCamera()
        {
            if (!isPlaying)
            {
                return;
            }

            if (webcam != null)
            {
                webcam.Stop();
                webcam = null;
            }
            isPlaying = false;
        }

        private void ApplyOrientation()
        {
            if (webcam == null)
            {
                return;
            }

            int rotation = webcam.videoRotationAngle;
            bool verticalMirror = webcam.videoVerticallyMirrored;

            if (rawRect != null)
            {
                rawRect.localEulerAngles = new Vector3(0f, 0f, -rotation);

                Vector3 scale = rawRect.localScale;
                scale.x = mirrorHorizontal ? -Mathf.Abs(scale.x) : Mathf.Abs(scale.x);
                scale.y = (mirrorVertical ^ verticalMirror) ? -Mathf.Abs(scale.y) : Mathf.Abs(scale.y);
                rawRect.localScale = scale;

                if (fillScreen)
                {
                    ApplyFillUV();
                }
            }
            else if (targetRenderer != null)
            {
                Vector3 scale = targetRenderer.transform.localScale;
                scale.x = mirrorHorizontal ? -Mathf.Abs(scale.x) : Mathf.Abs(scale.x);
                scale.y = (mirrorVertical ^ verticalMirror) ? -Mathf.Abs(scale.y) : Mathf.Abs(scale.y);
                targetRenderer.transform.localScale = scale;
            }
        }

        private void ApplyFillUV()
        {
            if (rawImage == null || webcam == null || !webcam.isPlaying)
            {
                return;
            }

            float screenAspect = (float)Screen.width / Mathf.Max(1f, Screen.height);
            float texAspect = (float)webcam.width / Mathf.Max(1f, webcam.height);

            if (screenAspect > texAspect)
            {
                float scale = texAspect / screenAspect;
                rawImage.uvRect = new Rect(0f, (1f - scale) * 0.5f, 1f, scale);
            }
            else
            {
                float scale = screenAspect / texAspect;
                rawImage.uvRect = new Rect((1f - scale) * 0.5f, 0f, scale, 1f);
            }
        }
    }
}
