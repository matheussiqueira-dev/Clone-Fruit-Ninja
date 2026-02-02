using UnityEngine;

namespace FruitNinjaClone.UI
{
    [ExecuteAlways]
    public class SafeAreaFitter : MonoBehaviour
    {
        public RectTransform target;
        public bool updateEveryFrame;

        private Rect lastSafeArea;

        private void Awake()
        {
            if (target == null)
            {
                target = GetComponent<RectTransform>();
            }
        }

        private void Start()
        {
            Apply();
        }

        private void Update()
        {
            if (updateEveryFrame || Screen.safeArea != lastSafeArea)
            {
                Apply();
            }
        }

        private void Apply()
        {
            if (target == null)
            {
                return;
            }

            Rect safe = Screen.safeArea;
            Vector2 min = safe.position;
            Vector2 max = safe.position + safe.size;

            min.x /= Screen.width;
            min.y /= Screen.height;
            max.x /= Screen.width;
            max.y /= Screen.height;

            target.anchorMin = min;
            target.anchorMax = max;

            lastSafeArea = safe;
        }
    }
}
