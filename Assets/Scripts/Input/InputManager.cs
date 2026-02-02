using UnityEngine;

namespace FruitNinjaClone.InputSystem
{
    public class InputManager : MonoBehaviour
    {
        [Header("References")]
        public Camera worldCamera;
        public GestureAnalyzer gesture;

        [Header("Sampling")]
        public float minSampleDistance = 0.03f;
        public float minSampleTime = 0.005f;

        private bool isTouching;
        private Vector2 lastSampleWorld;
        private float lastSampleTime;

        private void Awake()
        {
            if (worldCamera == null)
            {
                worldCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (gesture == null || worldCamera == null)
            {
                return;
            }

            if (TryGetPointer(out bool pressed, out bool released, out Vector2 screenPos))
            {
                Vector2 worldPos = ScreenToWorld(screenPos);
                float now = Time.unscaledTime;

                if (pressed)
                {
                    isTouching = true;
                    lastSampleWorld = worldPos;
                    lastSampleTime = now;
                    gesture.BeginSwipe(worldPos, now);
                    return;
                }

                if (isTouching)
                {
                    float dist = Vector2.Distance(lastSampleWorld, worldPos);
                    float dt = now - lastSampleTime;

                    if (dist >= minSampleDistance && dt >= minSampleTime)
                    {
                        lastSampleWorld = worldPos;
                        lastSampleTime = now;
                        gesture.AddSample(worldPos, now);
                    }
                }

                if (released)
                {
                    isTouching = false;
                    gesture.EndSwipe(Time.unscaledTime);
                }
            }
        }

        private Vector2 ScreenToWorld(Vector2 screenPos)
        {
            float z = Mathf.Abs(worldCamera.transform.position.z);
            Vector3 world = worldCamera.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, z));
            return new Vector2(world.x, world.y);
        }

        private bool TryGetPointer(out bool pressed, out bool released, out Vector2 screenPos)
        {
            pressed = false;
            released = false;
            screenPos = Vector2.zero;

            if (Input.touchSupported && Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);
                screenPos = touch.position;
                if (touch.phase == TouchPhase.Began)
                {
                    pressed = true;
                }
                else if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
                {
                    released = true;
                }
                return true;
            }

            if (Input.GetMouseButtonDown(0))
            {
                pressed = true;
                screenPos = Input.mousePosition;
                return true;
            }

            if (Input.GetMouseButton(0))
            {
                screenPos = Input.mousePosition;
                return true;
            }

            if (Input.GetMouseButtonUp(0))
            {
                released = true;
                screenPos = Input.mousePosition;
                return true;
            }

            return false;
        }
    }
}
