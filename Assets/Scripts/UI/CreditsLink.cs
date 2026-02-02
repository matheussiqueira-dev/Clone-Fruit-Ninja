using UnityEngine;
using UnityEngine.UI;

namespace FruitNinjaClone.UI
{
    public class CreditsLink : MonoBehaviour
    {
        [Header("Text")]
        public Text prefixText;
        public Text linkText;

        [Header("Link")]
        public Button linkButton;
        public string prefix = "Desenvolvido por Matheus Siqueira";
        public string linkLabel = "www.matheussiqueira.dev";
        public string url = "https://www.matheussiqueira.dev";

        private void Awake()
        {
            if (linkButton == null)
            {
                linkButton = GetComponent<Button>();
            }
            if (linkText == null && linkButton != null)
            {
                linkText = linkButton.GetComponentInChildren<Text>();
            }
        }

        private void OnEnable()
        {
            ApplyLabels();
            if (linkButton != null)
            {
                linkButton.onClick.AddListener(OpenUrl);
            }
        }

        private void OnDisable()
        {
            if (linkButton != null)
            {
                linkButton.onClick.RemoveListener(OpenUrl);
            }
        }

        public void ApplyLabels()
        {
            if (prefixText != null)
            {
                prefixText.text = prefix;
            }
            if (linkText != null)
            {
                linkText.text = linkLabel;
            }
        }

        public void OpenUrl()
        {
            if (!string.IsNullOrEmpty(url))
            {
                Application.OpenURL(url);
            }
        }
    }
}
