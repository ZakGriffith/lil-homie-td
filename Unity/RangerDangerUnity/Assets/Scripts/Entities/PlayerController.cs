using RangerDanger.Data;
using RangerDanger.Input;
using UnityEngine;

namespace RangerDanger.Entities
{
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private GameBalance balance;
        [SerializeField] private Transform bowPivot;
        [SerializeField] private Transform projectileSpawn;

        private Rigidbody2D body;
        private Vector2 moveInput;
        private Vector2 aimInput = Vector2.right;

        public int Money { get; private set; }
        public int Kills { get; private set; }
        public float FacingRadians => Mathf.Atan2(aimInput.y, aimInput.x);

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            Money = balance != null ? balance.startMoney : 0;
        }

        private void Update()
        {
            moveInput = PlayerInputReader.Move;
            if (PlayerInputReader.Aim.sqrMagnitude > 0.001f)
            {
                aimInput = PlayerInputReader.Aim.normalized;
            }

            if (bowPivot != null)
            {
                bowPivot.right = aimInput;
            }
        }

        private void FixedUpdate()
        {
            var speed = balance != null ? balance.player.speed : 4.6875f;
            body.velocity = moveInput.normalized * speed;
        }

        public bool Spend(int amount)
        {
            if (Money < amount)
            {
                return false;
            }

            Money -= amount;
            return true;
        }

        public void AddMoney(int amount)
        {
            Money += amount;
        }

        public void AddKill()
        {
            Kills++;
        }
    }
}
