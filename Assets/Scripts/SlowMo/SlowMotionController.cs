using UnityEngine;
using FruitNinjaClone.Slicing;
using FruitNinjaClone.CameraSystem;

namespace FruitNinjaClone.SlowMo
{
    public class SlowMotionController : MonoBehaviour
    {
        [Header("References")]
        public SliceSystem sliceSystem;
        public CameraImpulseController cameraController;

        [Header("Timing")]
        [Range(0.05f, 1f)]
        public float minTimeScale = 0.25f;
        public float enterDuration = 0.12f;
        public float holdDuration = 0.25f;
        public float exitDuration = 0.2f;

        [Header("Triggers")]
        public float speedThreshold = 16f;
        public float centerThreshold = 0.35f;
        public int comboThreshold = 2;
        public float cooldown = 0.08f;

        private float baseFixedDeltaTime;
        private float currentScale = 1f;
        private float targetScale = 1f;
        private float holdTimer;
        private float lastTriggerTime;

        public bool IsSlowMo => currentScale < 0.99f;

        private void Awake()
        {
            baseFixedDeltaTime = Time.fixedDeltaTime;
        }

        private void OnEnable()
        {
            if (sliceSystem != null)
            {
                sliceSystem.OnFruitSliced += HandleSlice;
            }
        }

        private void OnDisable()
        {
            if (sliceSystem != null)
            {
                sliceSystem.OnFruitSliced -= HandleSlice;
            }
        }

        private void Update()
        {
            float dt = Time.unscaledDeltaTime;
            if (holdTimer > 0f)
            {
                holdTimer -= dt;
                targetScale = minTimeScale;
            }
            else
            {
                targetScale = 1f;
            }

            float duration = targetScale < currentScale ? enterDuration : exitDuration;
            if (duration <= 0f)
            {
                currentScale = targetScale;
            }
            else
            {
                currentScale = Mathf.MoveTowards(currentScale, targetScale, dt / duration);
            }

            ApplyTimeScale(currentScale);

            if (cameraController != null)
            {
                cameraController.SetSlowMoBlend(1f - currentScale);
            }
        }

        private void HandleSlice(FruitSliceInfo info)
        {
            bool speed = info.SwipeSpeed >= speedThreshold;
            bool center = info.CenterDistance01 <= centerThreshold;
            bool combo = info.ComboCount >= comboThreshold;

            if (!speed && !center && !combo)
            {
                return;
            }

            if (Time.unscaledTime - lastTriggerTime < cooldown)
            {
                return;
            }

            TriggerSlowMo();
        }

        public void TriggerSlowMo()
        {
            lastTriggerTime = Time.unscaledTime;
            holdTimer = Mathf.Max(holdTimer, holdDuration);
            targetScale = minTimeScale;
        }

        private void ApplyTimeScale(float scale)
        {
            Time.timeScale = scale;
            Time.fixedDeltaTime = baseFixedDeltaTime * scale;
        }
    }
}
