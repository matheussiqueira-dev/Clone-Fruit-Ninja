using UnityEngine;
using UnityEngine.UI;

namespace FruitNinjaClone.UI
{
    public class HUDController : MonoBehaviour
    {
        [Header("Blocks")]
        public Image scoreBlock;
        public Image comboBlock;
        public Image timerBlock;
        public Image statusBlock;

        [Header("Labels")]
        public Text scoreText;
        public Text comboText;
        public Text timerText;
        public Text statusText;

        [Header("Defaults")]
        public string scorePrefix = "Score";
        public string comboPrefix = "Combo";
        public string timerPrefix = "Time";
        public bool applyBlockColorOnStart = true;
        public Color blockColor = new Color(0f, 0f, 0f, 0.65f);

        private void Start()
        {
            if (applyBlockColorOnStart)
            {
                ApplyBlockColors();
            }
        }

        public void SetScore(int score)
        {
            if (scoreText != null)
            {
                scoreText.text = scorePrefix + ": " + score.ToString();
            }
        }

        public void SetCombo(int combo)
        {
            if (comboText != null)
            {
                comboText.text = comboPrefix + ": " + combo.ToString();
            }
        }

        public void SetTimer(float seconds)
        {
            if (timerText != null)
            {
                int minutes = Mathf.FloorToInt(seconds / 60f);
                int secs = Mathf.FloorToInt(seconds % 60f);
                timerText.text = timerPrefix + ": " + minutes.ToString("00") + ":" + secs.ToString("00");
            }
        }

        public void SetStatus(string status)
        {
            if (statusText != null)
            {
                statusText.text = status;
            }
        }

        public void SetBlocksVisible(bool visible)
        {
            SetBlockVisible(scoreBlock, visible);
            SetBlockVisible(comboBlock, visible);
            SetBlockVisible(timerBlock, visible);
            SetBlockVisible(statusBlock, visible);
        }

        public void ApplyBlockColors()
        {
            ApplyBlockColor(scoreBlock, blockColor);
            ApplyBlockColor(comboBlock, blockColor);
            ApplyBlockColor(timerBlock, blockColor);
            ApplyBlockColor(statusBlock, blockColor);
        }

        private void SetBlockVisible(Image block, bool visible)
        {
            if (block == null)
            {
                return;
            }

            block.enabled = visible;
        }

        private void ApplyBlockColor(Image block, Color color)
        {
            if (block == null)
            {
                return;
            }

            block.color = color;
        }
    }
}
