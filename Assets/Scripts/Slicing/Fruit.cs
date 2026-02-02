using UnityEngine;
using FruitNinjaClone.VFX;

namespace FruitNinjaClone.Slicing
{
    [RequireComponent(typeof(Collider2D))]
    [RequireComponent(typeof(Rigidbody2D))]
    public class Fruit : MonoBehaviour
    {
        public FruitDefinition definition;
        public SpriteRenderer spriteRenderer;
        public Collider2D hitCollider;
        public Rigidbody2D body;

        [Header("Slice")]
        public float halfOffset = 0.06f;
        public float upBoost = 0.3f;

        public bool IsSliced { get; private set; }

        private void Awake()
        {
            if (spriteRenderer == null)
            {
                spriteRenderer = GetComponentInChildren<SpriteRenderer>();
            }
            if (hitCollider == null)
            {
                hitCollider = GetComponent<Collider2D>();
            }
            if (body == null)
            {
                body = GetComponent<Rigidbody2D>();
            }

            ApplyDefinition();
        }

        private void Start()
        {
            ApplyDefinition();
        }

        public void Slice(Vector2 segmentStart, Vector2 segmentEnd, Vector2 hitPoint)
        {
            if (IsSliced)
            {
                return;
            }

            IsSliced = true;

            if (hitCollider != null)
            {
                hitCollider.enabled = false;
            }
            if (body != null)
            {
                body.simulated = false;
            }
            if (spriteRenderer != null)
            {
                spriteRenderer.enabled = false;
            }

            Vector2 cutDirection = (segmentEnd - segmentStart).normalized;
            SpawnHalves(cutDirection);

            if (definition != null)
            {
                VisualEffectsManager.Instance?.SpawnJuice(hitPoint, definition.juiceParticles, definition.juiceColor, definition.juiceBurstCount);
                VisualEffectsManager.Instance?.PlayImpact(hitPoint, definition.juiceColor, definition.visualWeight);
            }
        }

        public float GetSliceRadius()
        {
            if (hitCollider is CircleCollider2D circle)
            {
                float scale = Mathf.Max(transform.lossyScale.x, transform.lossyScale.y);
                return circle.radius * scale;
            }

            if (hitCollider != null)
            {
                return hitCollider.bounds.extents.magnitude;
            }

            return 0.5f;
        }

        private void ApplyDefinition()
        {
            if (definition != null && spriteRenderer != null && definition.wholeSprite != null)
            {
                spriteRenderer.sprite = definition.wholeSprite;
            }
        }

        private void SpawnHalves(Vector2 cutDirection)
        {
            if (definition == null || definition.halfPrefabA == null || definition.halfPrefabB == null)
            {
                return;
            }

            Vector2 normal = new Vector2(-cutDirection.y, cutDirection.x);
            Vector3 pos = transform.position;

            GameObject halfA = Instantiate(definition.halfPrefabA, pos + (Vector3)(normal * halfOffset), Quaternion.identity);
            GameObject halfB = Instantiate(definition.halfPrefabB, pos - (Vector3)(normal * halfOffset), Quaternion.identity);

            ApplyHalfImpulse(halfA, cutDirection, normal, 1f);
            ApplyHalfImpulse(halfB, cutDirection, -normal, -1f);
        }

        private void ApplyHalfImpulse(GameObject half, Vector2 cutDirection, Vector2 normal, float torqueDir)
        {
            if (half == null || definition == null)
            {
                return;
            }

            Rigidbody2D halfBody = half.GetComponent<Rigidbody2D>();
            if (halfBody == null)
            {
                return;
            }

            Vector2 force = (cutDirection + normal + Vector2.up * upBoost).normalized * definition.splitForce;
            halfBody.AddForce(force, ForceMode2D.Impulse);
            halfBody.AddTorque(definition.spinForce * torqueDir, ForceMode2D.Impulse);
        }
    }
}
