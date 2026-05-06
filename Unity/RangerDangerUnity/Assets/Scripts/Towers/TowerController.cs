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
        [SerializeField] private LayerMask enemyMask = ~0;
        [SerializeField] private int totalInvested;

        private TowerLevelBalance stats;
        private float nextShotAt;

        public int LevelIndex => levelIndex;
        public int TotalInvested => totalInvested;

        private void Awake()
        {
            RefreshStats();
        }

        public void Configure(GameBalance gameBalance, TowerKind towerKind, int level, Projectile projectilePrototype = null, int initialInvestment = 0)
        {
            balance = gameBalance;
            kind = towerKind;
            levelIndex = level;
            if (initialInvestment > 0)
            {
                totalInvested = initialInvestment;
            }

            if (projectilePrototype != null)
            {
                projectilePrefab = projectilePrototype;
            }

            if (balance == null)
            {
                return;
            }

            RefreshStats();
        }

        private void RefreshStats()
        {
            if (balance == null)
            {
                return;
            }

            var tower = balance.GetTower(kind);
            stats = tower.levels[Mathf.Clamp(levelIndex, 0, tower.levels.Length - 1)];
        }

        public bool CanUpgrade()
        {
            if (balance == null)
            {
                return false;
            }

            var tower = balance.GetTower(kind);
            return levelIndex < tower.levels.Length - 1;
        }

        public int GetUpgradeCost()
        {
            return CanUpgrade() ? stats.upgradeCost : 0;
        }

        public void Upgrade()
        {
            if (!CanUpgrade())
            {
                return;
            }

            totalInvested += GetUpgradeCost();
            levelIndex++;
            RefreshStats();
        }

        public int GetSellRefund()
        {
            return Mathf.FloorToInt(totalInvested * 0.5f);
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
                if (!hit.TryGetComponent<EnemyController>(out _) || !hit.TryGetComponent<Damageable>(out var damageable) || damageable.IsDead)
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
