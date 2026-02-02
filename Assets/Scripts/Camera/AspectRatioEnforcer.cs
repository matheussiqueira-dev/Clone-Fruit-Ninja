using UnityEngine;

namespace FruitNinjaClone.CameraSystem
{
    public class AspectRatioEnforcer : MonoBehaviour
    {
        public Camera targetCamera;
        public float targetAspect = 9f / 16f;
        public bool updateEveryFrame;

        private int lastWidth;
        private int lastHeight;

        private void Awake()
        {
            if (targetCamera == null)
            {
                targetCamera = Camera.main;
            }
        }

        private void Start()
        {
            Apply();
        }

        private void Update()
        {
            if (updateEveryFrame || Screen.width != lastWidth || Screen.height != lastHeight)
            {
                Apply();
            }
        }

        private void Apply()
        {
            if (targetCamera == null)
            {
                return;
            }

            float windowAspect = (float)Screen.width / Screen.height;
            float scaleHeight = windowAspect / targetAspect;
            Rect rect = targetCamera.rect;

            if (scaleHeight < 1f)
            {
                rect.width = 1f;
                rect.height = scaleHeight;
                rect.x = 0f;
                rect.y = (1f - scaleHeight) / 2f;
            }
            else
            {
                float scaleWidth = 1f / scaleHeight;
                rect.width = scaleWidth;
                rect.height = 1f;
                rect.x = (1f - scaleWidth) / 2f;
                rect.y = 0f;
            }

            targetCamera.rect = rect;
            lastWidth = Screen.width;
            lastHeight = Screen.height;
        }
    }
}
