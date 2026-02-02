using System.Collections;
using UnityEngine;

namespace FruitNinjaClone.Slicing
{
    public class FruitHalf : MonoBehaviour
    {
        public float lifetime = 3f;
        public float fadeDuration = 0.25f;

        private SpriteRenderer spriteRenderer;

        private void Awake()
        {
            spriteRenderer = GetComponentInChildren<SpriteRenderer>();
        }

        private void OnEnable()
        {
            StartCoroutine(ExpireRoutine());
        }

        private IEnumerator ExpireRoutine()
        {
            float wait = Mathf.Max(0f, lifetime - fadeDuration);
            if (wait > 0f)
            {
                yield return new WaitForSeconds(wait);
            }

            if (spriteRenderer == null || fadeDuration <= 0f)
            {
                Destroy(gameObject);
                yield break;
            }

            float elapsed = 0f;
            Color start = spriteRenderer.color;
            while (elapsed < fadeDuration)
            {
                float t = elapsed / fadeDuration;
                spriteRenderer.color = new Color(start.r, start.g, start.b, Mathf.Lerp(start.a, 0f, t));
                elapsed += Time.deltaTime;
                yield return null;
            }

            Destroy(gameObject);
        }
    }
}
