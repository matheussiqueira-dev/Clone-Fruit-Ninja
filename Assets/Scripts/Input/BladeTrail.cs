using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace FruitNinjaClone.InputSystem
{
    [RequireComponent(typeof(LineRenderer))]
    public class BladeTrail : MonoBehaviour
    {
        [Header("References")]
        public GestureAnalyzer gesture;
        public LineRenderer line;

        [Header("Width by Speed")]
        public float minWidth = 0.05f;
        public float maxWidth = 0.18f;
        public float speedForMaxWidth = 18f;

        [Header("Fade")]
        public float fadeDuration = 0.12f;

        private readonly List<Vector3> points = new List<Vector3>();
        private readonly List<float> speeds = new List<float>();
        private int lastPointCount;
        private Coroutine fadeRoutine;
        private Gradient baseGradient;

        private void Awake()
        {
            if (line == null)
            {
                line = GetComponent<LineRenderer>();
            }
            baseGradient = line.colorGradient;
        }

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

            int totalPoints = gesture.SmoothedPoints.Count;
            if (totalPoints <= lastPointCount)
            {
                return;
            }

            for (int i = lastPointCount; i < totalPoints; i++)
            {
                Vector2 p = gesture.SmoothedPoints[i];
                points.Add(new Vector3(p.x, p.y, 0f));
                speeds.Add(gesture.SmoothedSpeeds[i]);
            }

            lastPointCount = totalPoints;
            UpdateLine();
        }

        private void HandleSwipeStarted(int swipeId)
        {
            if (fadeRoutine != null)
            {
                StopCoroutine(fadeRoutine);
                fadeRoutine = null;
            }

            points.Clear();
            speeds.Clear();
            lastPointCount = 0;
            line.positionCount = 0;
            line.colorGradient = baseGradient;
        }

        private void HandleSwipeEnded(int swipeId)
        {
            if (fadeRoutine != null)
            {
                StopCoroutine(fadeRoutine);
            }
            fadeRoutine = StartCoroutine(FadeOut());
        }

        private void UpdateLine()
        {
            if (points.Count == 0)
            {
                return;
            }

            line.positionCount = points.Count;
            line.SetPositions(points.ToArray());
            line.widthCurve = BuildWidthCurve();
        }

        private AnimationCurve BuildWidthCurve()
        {
            AnimationCurve curve = new AnimationCurve();
            int count = points.Count;
            if (count == 1)
            {
                curve.AddKey(0f, minWidth);
                return curve;
            }

            int step = Mathf.Max(1, count / 32);
            for (int i = 0; i < count; i += step)
            {
                float t = i / (float)(count - 1);
                float width = SpeedToWidth(speeds[i]);
                curve.AddKey(t, width);
            }

            if ((count - 1) % step != 0)
            {
                float width = SpeedToWidth(speeds[count - 1]);
                curve.AddKey(1f, width);
            }

            return curve;
        }

        private float SpeedToWidth(float speed)
        {
            float t = Mathf.InverseLerp(0f, speedForMaxWidth, speed);
            return Mathf.Lerp(minWidth, maxWidth, t);
        }

        private IEnumerator FadeOut()
        {
            float elapsed = 0f;
            while (elapsed < fadeDuration)
            {
                float alpha = 1f - (elapsed / fadeDuration);
                line.colorGradient = MultiplyAlpha(baseGradient, alpha);
                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            line.positionCount = 0;
            points.Clear();
            speeds.Clear();
            lastPointCount = 0;
            line.colorGradient = baseGradient;
            fadeRoutine = null;
        }

        private static Gradient MultiplyAlpha(Gradient source, float alpha)
        {
            Gradient gradient = new Gradient();
            GradientColorKey[] colorKeys = source.colorKeys;
            GradientAlphaKey[] alphaKeys = source.alphaKeys;

            for (int i = 0; i < alphaKeys.Length; i++)
            {
                alphaKeys[i].alpha *= alpha;
            }

            gradient.SetKeys(colorKeys, alphaKeys);
            return gradient;
        }
    }
}
