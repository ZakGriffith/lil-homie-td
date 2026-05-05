using UnityEngine;

namespace RangerDanger.Entities
{
    public sealed class Damageable : MonoBehaviour
    {
        [SerializeField] private int maxHp = 1;

        public int Hp { get; private set; }
        public int MaxHp => maxHp;
        public bool IsDead => Hp <= 0;

        private void Awake()
        {
            Hp = maxHp;
        }

        public void Configure(int hp)
        {
            maxHp = hp;
            Hp = hp;
        }

        public void Hurt(int amount)
        {
            if (IsDead)
            {
                return;
            }

            Hp = Mathf.Max(0, Hp - amount);
            if (IsDead)
            {
                gameObject.SetActive(false);
            }
        }
    }
}
