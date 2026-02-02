using System;
using System.Collections.Generic;
using UnityEngine;
using FruitNinjaClone.Utils;

namespace FruitNinjaClone.InputSystem
{
    public struct GestureSegment
    {
        public Vector2 Start;
        public Vector2 End;
        public float Speed;

        public GestureSegment(Vector2 start, Vector2 end, float speed)
        {
            Start = start;
            End = end;
            Speed = speed;
        }
    }

    public class GestureAnalyzer : MonoBehaviour
    {
        [Header("Smoothing")]
        public float smoothingDistance = 0.08f;
        public int minSubdivisions = 2;
        public int maxSubdivisions = 8;
        public int maxSmoothedPoints = 96;

        public bool IsSwiping { get; private set; }
        public int SwipeId { get; private set; }
        public float CurrentSpeed { get; private set; }
        public float PeakSpeed { get; private set; }

        public event Action<int> OnSwipeStarted;
        public event Action<int> OnSwipeEnded;

        private readonly List<Vector2> rawPoints = new List<Vector2>();
        private readonly List<float> rawTimes = new List<float>();
        private readonly List<float> rawSpeeds = new List<float>();

        private readonly List<Vector2> smoothPoints = new List<Vector2>();
        private readonly List<float> smoothSpeeds = new List<float>();

        private int lastEmittedIndex;
        private bool usingSpline;

        public IReadOnlyList<Vector2> SmoothedPoints => smoothPoints;
        public IReadOnlyList<float> SmoothedSpeeds => smoothSpeeds;

        public void BeginSwipe(Vector2 worldPos, float time)
        {
            IsSwiping = true;
            SwipeId++;
            CurrentSpeed = 0f;
            PeakSpeed = 0f;
            rawPoints.Clear();
            rawTimes.Clear();
            rawSpeeds.Clear();
            smoothPoints.Clear();
            smoothSpeeds.Clear();
            lastEmittedIndex = 0;
            usingSpline = false;

            AddRawPoint(worldPos, time);
            smoothPoints.Add(worldPos);
            smoothSpeeds.Add(0f);

            OnSwipeStarted?.Invoke(SwipeId);
        }

        public void AddSample(Vector2 worldPos, float time)
        {
            if (!IsSwiping)
            {
                return;
            }

            float speed = AddRawPoint(worldPos, time);
            CurrentSpeed = speed;
            PeakSpeed = Mathf.Max(PeakSpeed, speed);

            if (rawPoints.Count < 4)
            {
                smoothPoints.Add(worldPos);
                smoothSpeeds.Add(speed);
                TrimSmoothPoints();
                return;
            }

            int n = rawPoints.Count;
            Vector2 p0 = rawPoints[n - 4];
            Vector2 p1 = rawPoints[n - 3];
            Vector2 p2 = rawPoints[n - 2];
            Vector2 p3 = rawPoints[n - 1];
            float s1 = rawSpeeds[n - 3];
            float s2 = rawSpeeds[n - 2];

            if (!usingSpline)
            {
                usingSpline = true;
                int removeCount = Mathf.Min(2, smoothPoints.Count);
                if (removeCount > 0)
                {
                    smoothPoints.RemoveRange(smoothPoints.Count - removeCount, removeCount);
                    smoothSpeeds.RemoveRange(smoothSpeeds.Count - removeCount, removeCount);
                }
                smoothPoints.Add(p1);
                smoothSpeeds.Add(s1);
            }

            float distance = Vector2.Distance(p1, p2);
            int subdivisions = Mathf.Clamp(Mathf.CeilToInt(distance / Mathf.Max(0.001f, smoothingDistance)), minSubdivisions, maxSubdivisions);

            for (int i = 1; i <= subdivisions; i++)
            {
                float t = i / (float)subdivisions;
                Vector2 point = SplineUtils.CatmullRom(p0, p1, p2, p3, t);
                float speedT = Mathf.Lerp(s1, s2, t);
                smoothPoints.Add(point);
                smoothSpeeds.Add(speedT);
            }

            TrimSmoothPoints();
        }

        public void EndSwipe(float time)
        {
            if (!IsSwiping)
            {
                return;
            }

            IsSwiping = false;
            OnSwipeEnded?.Invoke(SwipeId);
        }

        public int ConsumeNewSegments(List<GestureSegment> buffer)
        {
            int count = 0;
            int endIndex = smoothPoints.Count - 1;
            for (int i = lastEmittedIndex; i < endIndex; i++)
            {
                buffer.Add(new GestureSegment(smoothPoints[i], smoothPoints[i + 1], smoothSpeeds[i + 1]));
                count++;
            }

            lastEmittedIndex = Mathf.Max(0, endIndex);
            return count;
        }

        private float AddRawPoint(Vector2 worldPos, float time)
        {
            float speed = 0f;
            if (rawPoints.Count > 0)
            {
                int last = rawPoints.Count - 1;
                float dt = Mathf.Max(0.0001f, time - rawTimes[last]);
                float dist = Vector2.Distance(rawPoints[last], worldPos);
                speed = dist / dt;
            }

            rawPoints.Add(worldPos);
            rawTimes.Add(time);
            rawSpeeds.Add(speed);
            return speed;
        }

        private void TrimSmoothPoints()
        {
            if (smoothPoints.Count <= maxSmoothedPoints)
            {
                return;
            }

            int remove = smoothPoints.Count - maxSmoothedPoints;
            smoothPoints.RemoveRange(0, remove);
            smoothSpeeds.RemoveRange(0, remove);
            lastEmittedIndex = Mathf.Max(0, lastEmittedIndex - remove);
        }
    }
}
