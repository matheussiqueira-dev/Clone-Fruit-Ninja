using System.Collections.Generic;
using UnityEngine;
using FruitNinjaClone.Slicing;

namespace FruitNinjaClone.Spawning
{
    public class FruitSpawner : MonoBehaviour
    {
        [Header("Prefabs")]
        public Fruit fruitPrefab;
        public List<FruitDefinition> fruitDefinitions = new List<FruitDefinition>();

        [Header("Timing")]
        public float timeBetweenWaves = 0.85f;
        public bool useUnscaledTime = true;

        [Header("Spawn Area")]
        public float spawnY = -6f;
        public Vector2 spawnXRange = new Vector2(-3.2f, 3.2f);

        [Header("Arc Shape")]
        public Vector2 apexYRange = new Vector2(3.6f, 4.6f);
        public float gravityScale = 1.2f;
        public float apexXOffsetRange = 0.4f;

        [Header("Pattern")]
        public int minPerWave = 1;
        public int maxPerWave = 4;
        public float spacingFactor = 0.85f;

        [Header("Spin")]
        public float minSpin = -120f;
        public float maxSpin = 120f;

        private float nextSpawnTime;

        private void Update()
        {
            float now = useUnscaledTime ? Time.unscaledTime : Time.time;
            if (now >= nextSpawnTime)
            {
                SpawnWave();
                nextSpawnTime = now + timeBetweenWaves;
            }
        }

        private void SpawnWave()
        {
            if (fruitPrefab == null)
            {
                return;
            }

            int count = Random.Range(minPerWave, maxPerWave + 1);
            float centerX = 0f;
            float maxOffset = Mathf.Min(centerX - spawnXRange.x, spawnXRange.y - centerX);
            int pairs = count / 2;
            float spacing = pairs > 0 ? (maxOffset / pairs) * spacingFactor : 0f;

            List<float> positions = new List<float>();
            if (count % 2 == 1)
            {
                positions.Add(centerX);
            }
            for (int i = 1; i <= pairs; i++)
            {
                float offset = i * spacing;
                positions.Add(centerX - offset);
                positions.Add(centerX + offset);
            }

            float apexY = Random.Range(apexYRange.x, apexYRange.y);
            float apexX = centerX + Random.Range(-apexXOffsetRange, apexXOffsetRange);

            for (int i = 0; i < positions.Count; i++)
            {
                SpawnFruitAt(positions[i], apexX, apexY);
            }
        }

        private void SpawnFruitAt(float x, float apexX, float apexY)
        {
            Vector3 spawnPos = new Vector3(x, spawnY, 0f);
            Fruit fruit = Instantiate(fruitPrefab, spawnPos, Quaternion.identity);
            fruit.definition = PickDefinition();

            if (fruit.body != null)
            {
                float g = Mathf.Abs(Physics2D.gravity.y) * gravityScale;
                float height = Mathf.Max(0.1f, apexY - spawnY);
                float timeToApex = Mathf.Sqrt(2f * height / g);
                float v0y = g * timeToApex;
                float v0x = (apexX - x) / Mathf.Max(0.05f, timeToApex);

                fruit.body.gravityScale = gravityScale;
                fruit.body.velocity = new Vector2(v0x, v0y);
                fruit.body.angularVelocity = Random.Range(minSpin, maxSpin);
            }
        }

        private FruitDefinition PickDefinition()
        {
            if (fruitDefinitions == null || fruitDefinitions.Count == 0)
            {
                return null;
            }

            int index = Random.Range(0, fruitDefinitions.Count);
            return fruitDefinitions[index];
        }
    }
}
