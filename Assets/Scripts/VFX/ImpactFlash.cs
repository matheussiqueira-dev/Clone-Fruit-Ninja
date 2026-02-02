using System.Collections;
using UnityEngine;

namespace FruitNinjaClone.VFX
{
    public class ImpactFlash : MonoBehaviour
    {
        public SpriteRenderer sprite;
        public float duration = 0.08f;
        public float maxScale = 1.2f;

        private Coroutine routine;

        private void Awake()
        {
            if (sprite == null)
            {
                sprite = GetComponentInChildren<SpriteRenderer>();
            }
        }

        public void Play(Vector3 position, Color color, float intensity)
        {
            if (sprite == null)
            {
                return;
            }

            transform.position = position;
            sprite.color = new Color(color.r, color.g, color.b, 1f);
            float scale = Mathf.Lerp(1f, maxScale, Mathf.Clamp01(intensity));
            transform.localScale = Vector3.one * scale;

            if (routine != null)
            {
                StopCoroutine(routine);
            }
            routine = StartCoroutine(FadeOut());
        }

        private IEnumerator FadeOut()
        {
            float elapsed = 0f;
            Color start = sprite.color;
            while (elapsed < duration)
            {
                float t = elapsed / duration;
                sprite.color = new Color(start.r, start.g, start.b, Mathf.Lerp(start.a, 0f, t));
                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            sprite.color = new Color(start.r, start.g, start.b, 0f);
            routine = null;
        }
    }
}
