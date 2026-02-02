using System.Collections.Generic;
using UnityEngine;
using FruitNinjaClone.CameraSystem;

namespace FruitNinjaClone.VFX
{
    public class VisualEffectsManager : MonoBehaviour
    {
        public static VisualEffectsManager Instance { get; private set; }

        [Header("References")]
        public CameraImpulseController cameraController;
        public ImpactFlash impactFlash;

        [Header("Performance")]
        public int maxParticlesPerFrame = 120;

        [Header("Impact")]
        public float impactShake = 0.2f;

        private readonly Dictionary<ParticleSystem, ParticlePool> pools = new Dictionary<ParticleSystem, ParticlePool>();
        private int particlesThisFrame;
        private int lastFrameCount;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        public void SpawnJuice(Vector3 position, ParticleSystem prefab, Color color, int burstCount)
        {
            if (prefab == null)
            {
                return;
            }

            ResetFrameBudgetIfNeeded();
            int allowed = Mathf.Max(0, maxParticlesPerFrame - particlesThisFrame);
            int emitCount = Mathf.Min(allowed, Mathf.Max(0, burstCount));
            if (emitCount == 0)
            {
                return;
            }

            ParticlePool pool = GetPool(prefab);
            ParticleSystem system = pool.Get();
            if (system == null)
            {
                return;
            }

            system.transform.position = position;
            var main = system.main;
            main.startColor = color;
            system.Clear(true);
            system.Play(true);
            system.Emit(emitCount);

            particlesThisFrame += emitCount;
        }

        public void PlayImpact(Vector3 position, Color color, float intensity)
        {
            if (impactFlash != null)
            {
                impactFlash.Play(position, color, intensity);
            }

            if (cameraController != null)
            {
                cameraController.AddImpulse(intensity * impactShake);
            }
        }

        private void ResetFrameBudgetIfNeeded()
        {
            if (Time.frameCount == lastFrameCount)
            {
                return;
            }

            lastFrameCount = Time.frameCount;
            particlesThisFrame = 0;
        }

        private ParticlePool GetPool(ParticleSystem prefab)
        {
            if (pools.TryGetValue(prefab, out ParticlePool pool))
            {
                return pool;
            }

            GameObject poolObject = new GameObject(prefab.name + "_Pool");
            poolObject.transform.SetParent(transform);
            pool = poolObject.AddComponent<ParticlePool>();
            pool.prefab = prefab;
            pool.Initialize();
            pools[prefab] = pool;
            return pool;
        }
    }
}
