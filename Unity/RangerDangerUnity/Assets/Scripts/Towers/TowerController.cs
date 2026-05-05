using RangerDanger.Combat;
using RangerDanger.Data;
using RangerDanger.Entities;
using UnityEngine;

namespace RangerDanger.Towers
{
    public sealed class TowerController : MonoBehaviour
    {
        [SerializeField] private GameBalance balance;
        [SerializeField] private TowerKind kind = TowerKind.Arrow;
        [SerializeField] private int levelIndex;
        [SerializeField] private Projectile projectilePrefab;
        [SerializeField] private Transform projectileSpawn;
        [SerializeField] private LayerMask enemyMask;

        private TowerLevelBalance stats;
        private float nextShotAt;

        private void Awake()
        {
            Configure(balance, kind, levelIndex);
        }

        public void Configure(GameBalance gameBalance, TowerKind towerKind, int level)
        {
            balance = gameBalance;
            kind = towerKind;
            levelIndex = level;
            if (balance == null)
            {
                return;
            }

            var tower = balance.GetTower(kind);
            stats = tower.levels[Mathf.Clamp(levelIndex, 0, tower.levels.Length - 1)];
        }

        private void Update()
        {
            if (balance == null || projectilePrefab == null || Time.time < nextShotAt)
            {
                return;
            }

            var target = FindTarget();
            if (target == null)
            {
                return;
            }

            FireAt(target.transform.position);
        }

        private Damageable FindTarget()
        {
            var hits = Physics2D.OverlapCircleAll(transform.position, stats.range, enemyMask);
            Damageable nearest = null;
            var nearestSq = float.MaxValue;

            foreach (var hit in hits)
            {
                if (!hit.TryGetComponent<Damageable>(out var damageable) || damageable.IsDead)
                {
                    continue;
                }

                var distanceSq = ((Vector2)hit.transform.position - (Vector2)transform.position).sqrMagnitude;
                if (distanceSq < nearestSq)
                {
                    nearestSq = distanceSq;
                    nearest = damageable;
                }
            }

            return nearest;
        }

        private void FireAt(Vector2 targetPosition)
        {
            nextShotAt = Time.time + stats.fireRateSeconds;
            var spawn = projectileSpawn != null ? (Vector2)projectileSpawn.position : (Vector2)transform.position;
            var direction = (targetPosition - spawn).normalized;
            var projectile = Instantiate(projectilePrefab);
            projectile.Launch(spawn, direction, stats.projectileSpeed, stats.damage);
        }
    }
}
