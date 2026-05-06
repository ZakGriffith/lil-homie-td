using RangerDanger.Data;
using RangerDanger.Combat;
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
        [SerializeField] private Projectile projectilePrefab;
        [SerializeField] private LayerMask enemyMask = ~0;

        private Rigidbody2D body;
        private Damageable damageable;
        private Vector2 moveInput;
        private Vector2 aimDirection = Vector2.right;
        private float nextShotAt;

        public int Money { get; private set; }
        public int Kills { get; private set; }
        public float FacingRadians => Mathf.Atan2(aimDirection.y, aimDirection.x);

        public void Configure(GameBalance gameBalance, Projectile projectilePrototype = null, Transform spawn = null)
        {
            balance = gameBalance;
            projectilePrefab = projectilePrototype;
            projectileSpawn = spawn;
            Money = balance != null ? balance.startMoney : 0;
        }

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            damageable = GetComponent<Damageable>();
            Money = balance != null ? balance.startMoney : 0;
        }

        private void Update()
        {
            if (damageable != null && damageable.IsDead)
            {
                moveInput = Vector2.zero;
                return;
            }

            moveInput = PlayerInputReader.Move;
            var target = FindNearestTarget();
            if (target != null)
            {
                aimDirection = ((Vector2)target.transform.position - (Vector2)transform.position).normalized;

                if (bowPivot != null)
                {
                    bowPivot.right = aimDirection;
                }
            }

            TryFire(target);
        }

        private void FixedUpdate()
        {
            if (damageable != null && damageable.IsDead)
            {
                body.linearVelocity = Vector2.zero;
                return;
            }

            var speed = balance != null ? balance.player.speed : 4.6875f;
            body.linearVelocity = moveInput.normalized * speed;
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

        private Damageable FindNearestTarget()
        {
            if (balance == null)
            {
                return null;
            }

            var hits = Physics2D.OverlapCircleAll(transform.position, balance.player.range, enemyMask);
            Damageable nearest = null;
            var nearestSq = float.MaxValue;

            foreach (var hit in hits)
            {
                if (!hit.TryGetComponent<Damageable>(out var candidate) || candidate == damageable || candidate.IsDead)
                {
                    continue;
                }

                var distanceSq = ((Vector2)hit.transform.position - (Vector2)transform.position).sqrMagnitude;
                if (distanceSq < nearestSq)
                {
                    nearestSq = distanceSq;
                    nearest = candidate;
                }
            }

            return nearest;
        }

        private void TryFire(Damageable target)
        {
            if (target == null || projectilePrefab == null || balance == null || Time.time < nextShotAt)
            {
                return;
            }

            nextShotAt = Time.time + balance.player.fireRateSeconds;
            var direction = ((Vector2)target.transform.position - (Vector2)transform.position).normalized;
            var spawn = (Vector2)transform.position + direction * 0.55f;
            var projectile = Instantiate(projectilePrefab);
            projectile.Launch(spawn, direction, balance.player.projectileSpeed, balance.player.damage, damageable);
        }
    }
}
