using UnityEngine;
using FruitNinjaClone.Slicing;
using FruitNinjaClone.UI;

namespace FruitNinjaClone.Gameplay
{
    public class ScoreManager : MonoBehaviour
    {
        public SliceSystem sliceSystem;
        public HUDController hud;

        [Header("Scoring")]
        public int pointsPerFruit = 10;
        public int comboBonus = 5;
        public float comboResetTime = 0.4f;

        private int score;
        private int combo;
        private float lastSliceTime;

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
            if (combo > 0 && Time.unscaledTime - lastSliceTime > comboResetTime)
            {
                combo = 0;
                if (hud != null)
                {
                    hud.SetCombo(combo);
                }
            }
        }

        private void HandleSlice(FruitSliceInfo info)
        {
            float now = Time.unscaledTime;
            if (now - lastSliceTime <= comboResetTime)
            {
                combo = Mathf.Max(1, combo + 1);
            }
            else
            {
                combo = 1;
            }

            lastSliceTime = now;
            int gained = pointsPerFruit + Mathf.Max(0, combo - 1) * comboBonus;
            score += gained;

            if (hud != null)
            {
                hud.SetScore(score);
                hud.SetCombo(combo);
            }
        }

        public void ResetScore()
        {
            score = 0;
            combo = 0;
            lastSliceTime = 0f;
            if (hud != null)
            {
                hud.SetScore(score);
                hud.SetCombo(combo);
            }
        }
    }
}
