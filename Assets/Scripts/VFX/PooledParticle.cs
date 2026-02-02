using System.Collections;
using UnityEngine;

namespace FruitNinjaClone.VFX
{
    public class PooledParticle : MonoBehaviour
    {
        private ParticlePool pool;
        private ParticleSystem system;
        private Coroutine routine;

        public void Init(ParticlePool pool, ParticleSystem system)
        {
            this.pool = pool;
            this.system = system;
        }

        private void OnEnable()
        {
            if (system == null || pool == null)
            {
                return;
            }

            if (routine != null)
            {
                StopCoroutine(routine);
            }
            routine = StartCoroutine(WaitForFinish());
        }

        private IEnumerator WaitForFinish()
        {
            while (system != null && system.IsAlive(true))
            {
                yield return null;
            }

            if (pool != null && system != null)
            {
                pool.Release(system);
            }

            routine = null;
        }
    }
}
