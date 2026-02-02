using System.Collections.Generic;
using UnityEngine;

namespace FruitNinjaClone.VFX
{
    public class ParticlePool : MonoBehaviour
    {
        public ParticleSystem prefab;
        public int prewarmCount = 8;

        private readonly Queue<ParticleSystem> pool = new Queue<ParticleSystem>();

        private bool initialized;

        private void Awake()
        {
            Initialize();
        }

        public void Initialize()
        {
            if (initialized || prefab == null)
            {
                return;
            }

            initialized = true;
            for (int i = 0; i < prewarmCount; i++)
            {
                ParticleSystem instance = CreateInstance();
                Release(instance);
            }
        }

        public ParticleSystem Get()
        {
            if (prefab == null)
            {
                return null;
            }

            if (pool.Count > 0)
            {
                ParticleSystem instance = pool.Dequeue();
                instance.gameObject.SetActive(true);
                return instance;
            }

            return CreateInstance();
        }

        public void Release(ParticleSystem instance)
        {
            if (instance == null)
            {
                return;
            }

            instance.gameObject.SetActive(false);
            pool.Enqueue(instance);
        }

        private ParticleSystem CreateInstance()
        {
            ParticleSystem instance = Instantiate(prefab, transform);
            instance.gameObject.SetActive(false);
            PooledParticle pooled = instance.gameObject.AddComponent<PooledParticle>();
            pooled.Init(this, instance);
            return instance;
        }
    }
}
