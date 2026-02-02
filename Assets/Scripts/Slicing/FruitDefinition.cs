using UnityEngine;

namespace FruitNinjaClone.Slicing
{
    [CreateAssetMenu(menuName = "Fruit Ninja/Fruit Definition")]
    public class FruitDefinition : ScriptableObject
    {
        public string displayName = "Fruit";
        public Sprite wholeSprite;
        public GameObject halfPrefabA;
        public GameObject halfPrefabB;

        [Header("Juice")]
        public Color juiceColor = Color.red;
        public ParticleSystem juiceParticles;
        public int juiceBurstCount = 12;

        [Header("Weight")]
        public float visualWeight = 1f;
        public float splitForce = 4f;
        public float spinForce = 8f;
    }
}
