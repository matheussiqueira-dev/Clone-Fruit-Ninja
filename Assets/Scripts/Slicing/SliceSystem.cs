using System;
using System.Collections.Generic;
using UnityEngine;
using FruitNinjaClone.InputSystem;

namespace FruitNinjaClone.Slicing
{
    public struct FruitSliceInfo
    {
        public Fruit Fruit;
        public Vector2 HitPoint;
        public Vector2 CutDirection;
        public float CenterDistance01;
        public float SwipeSpeed;
        public int ComboCount;
        public int SwipeId;
    }

    public class SliceSystem : MonoBehaviour
    {
        [Header("References")]
        public GestureAnalyzer gesture;
        public LayerMask fruitLayer;

        [Header("Blade Thickness")]
        public float bladeRadiusMin = 0.04f;
        public float bladeRadiusMax = 0.16f;
        public float speedForMaxRadius = 18f;

        public event Action<FruitSliceInfo> OnFruitSliced;

        private readonly List<GestureSegment> segments = new List<GestureSegment>();
        private readonly HashSet<int> slicedThisSwipe = new HashSet<int>();
        private int activeSwipeId;

        private void OnEnable()
        {
            if (gesture != null)
            {
                gesture.OnSwipeStarted += HandleSwipeStarted;
                gesture.OnSwipeEnded += HandleSwipeEnded;
            }
        }

        private void OnDisable()
        {
            if (gesture != null)
            {
                gesture.OnSwipeStarted -= HandleSwipeStarted;
                gesture.OnSwipeEnded -= HandleSwipeEnded;
            }
        }

        private void Update()
        {
            if (gesture == null || !gesture.IsSwiping)
            {
                return;
            }

            segments.Clear();
            gesture.ConsumeNewSegments(segments);
            for (int i = 0; i < segments.Count; i++)
            {
                ProcessSegment(segments[i]);
            }
        }

        private void HandleSwipeStarted(int swipeId)
        {
            activeSwipeId = swipeId;
            slicedThisSwipe.Clear();
        }

        private void HandleSwipeEnded(int swipeId)
        {
            slicedThisSwipe.Clear();
        }

        private void ProcessSegment(GestureSegment segment)
        {
            Vector2 delta = segment.End - segment.Start;
            float distance = delta.magnitude;
            if (distance <= 0.0001f)
            {
                return;
            }

            float radius = Mathf.Lerp(bladeRadiusMin, bladeRadiusMax, Mathf.InverseLerp(0f, speedForMaxRadius, segment.Speed));
            Vector2 direction = delta / distance;

            RaycastHit2D[] hits = Physics2D.CircleCastAll(segment.Start, radius, direction, distance, fruitLayer);
            for (int i = 0; i < hits.Length; i++)
            {
                Fruit fruit = hits[i].collider.GetComponentInParent<Fruit>();
                if (fruit == null || fruit.IsSliced)
                {
                    continue;
                }

                int id = fruit.GetInstanceID();
                if (slicedThisSwipe.Contains(id))
                {
                    continue;
                }

                slicedThisSwipe.Add(id);
                fruit.Slice(segment.Start, segment.End, hits[i].point);

                float radiusEstimate = fruit.GetSliceRadius();
                float centerDistance01 = radiusEstimate > 0f
                    ? Mathf.Clamp01(Vector2.Distance(fruit.transform.position, hits[i].point) / radiusEstimate)
                    : 1f;

                FruitSliceInfo info = new FruitSliceInfo
                {
                    Fruit = fruit,
                    HitPoint = hits[i].point,
                    CutDirection = direction,
                    CenterDistance01 = centerDistance01,
                    SwipeSpeed = segment.Speed,
                    ComboCount = slicedThisSwipe.Count,
                    SwipeId = activeSwipeId
                };

                OnFruitSliced?.Invoke(info);
            }
        }
    }
}
