using UnityEngine;

namespace RangerDanger.Entities
{
    [RequireComponent(typeof(TextMesh))]
    public sealed class HealthLabel : MonoBehaviour
    {
        [SerializeField] private Damageable target;

        private TextMesh label;

        public void Configure(Damageable damageable)
        {
            target = damageable;
        }

        private void Awake()
        {
            label = GetComponent<TextMesh>();
        }

        private void LateUpdate()
        {
            if (target == null || label == null)
            {
                return;
            }

            label.text = target.IsDead ? "KO" : $"HP {target.Hp}/{target.MaxHp}";
        }
    }
}
