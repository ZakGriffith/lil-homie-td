using System.Collections.Generic;
using RangerDanger.Data;
using RangerDanger.Economy;
using RangerDanger.Grid;
using UnityEngine;

namespace RangerDanger.Entities
{
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Damageable))]
    public sealed class EnemyController : MonoBehaviour
    {
        [SerializeField] private EnemyKind kind = EnemyKind.Snake;
        [SerializeField] private float repathSeconds = 0.35f;
        [SerializeField] private float waypointTolerance = 0.08f;
        [SerializeField] private float contactStopDistance = 0.75f;
        [SerializeField] private float contactDamageSeconds = 1f;
        [SerializeField] private float lineCheckStep = 0.5f;
        [SerializeField] private CoinPickup coinPrefab;

        private readonly List<Vector2Int> path = new();
        private Rigidbody2D body;
        private Damageable damageable;
        private GameBalance balance;
        private GridOccupancy grid;
        private Transform target;
        private Damageable targetDamageable;
        private EnemyBalance stats;
        private int pathIndex;
        private float nextRepathAt;
        private float nextContactDamageAt;

        public EnemyKind Kind => kind;
        public int CoinValue => stats.coin;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            damageable = GetComponent<Damageable>();
        }

        public void Configure(GameBalance gameBalance, GridOccupancy occupancy, Transform targetTransform, EnemyKind enemyKind, CoinPickup coinPrototype = null)
        {
            balance = gameBalance;
            grid = occupancy;
            target = targetTransform;
            coinPrefab = coinPrototype != null ? coinPrototype : coinPrefab;
            targetDamageable = target != null ? target.GetComponent<Damageable>() : null;
            kind = enemyKind;
            stats = balance.GetEnemy(kind);
            damageable.Configure(stats.hp);
            damageable.Died -= HandleDeath;
            damageable.Died += HandleDeath;
            nextRepathAt = 0f;
            nextContactDamageAt = 0f;
            path.Clear();
        }

        private void OnDestroy()
        {
            if (damageable != null)
            {
                damageable.Died -= HandleDeath;
            }
        }

        private void FixedUpdate()
        {
            if (target == null || grid == null || damageable.IsDead)
            {
                body.linearVelocity = Vector2.zero;
                return;
            }

            if (((Vector2)target.position - (Vector2)transform.position).sqrMagnitude <= contactStopDistance * contactStopDistance)
            {
                body.linearVelocity = Vector2.zero;
                TryDamageTarget();
                return;
            }

            if (HasClearLineToTarget())
            {
                ChaseDirectly();
                return;
            }

            if (Time.time >= nextRepathAt || pathIndex >= path.Count)
            {
                Repath();
            }

            FollowPath();
        }

        private void Repath()
        {
            nextRepathAt = Time.time + repathSeconds;
            var start = grid.WorldToCell(transform.position);
            var end = grid.WorldToCell(target.position);
            path.Clear();
            path.AddRange(Pathfinder.FindPath(grid.Cells, start, end));
            pathIndex = 0;
        }

        private bool HasClearLineToTarget()
        {
            var origin = (Vector2)transform.position;
            var destination = (Vector2)target.position;
            var delta = destination - origin;
            var distance = delta.magnitude;
            if (distance <= Mathf.Epsilon)
            {
                return true;
            }

            var steps = Mathf.Max(1, Mathf.CeilToInt(distance / lineCheckStep));
            for (var i = 1; i <= steps; i++)
            {
                var point = Vector2.Lerp(origin, destination, i / (float)steps);
                if (!grid.Cells.IsWalkable(grid.WorldToCell(point)))
                {
                    return false;
                }
            }

            return true;
        }

        private void ChaseDirectly()
        {
            path.Clear();
            pathIndex = 0;
            var delta = (Vector2)target.position - (Vector2)transform.position;
            body.linearVelocity = delta.normalized * stats.speed;
        }

        private void FollowPath()
        {
            if (pathIndex >= path.Count)
            {
                body.linearVelocity = Vector2.zero;
                return;
            }

            var waypoint = grid.CellToWorldCenter(path[pathIndex]);
            var delta = waypoint - (Vector2)transform.position;
            if (delta.magnitude <= waypointTolerance)
            {
                pathIndex++;
                return;
            }

            body.linearVelocity = delta.normalized * stats.speed;
        }

        private void TryDamageTarget()
        {
            if (targetDamageable == null || targetDamageable.IsDead || Time.time < nextContactDamageAt)
            {
                return;
            }

            nextContactDamageAt = Time.time + contactDamageSeconds;
            targetDamageable.Hurt(stats.damage);
        }

        private void HandleDeath(Damageable _)
        {
            if (target != null && target.TryGetComponent<PlayerController>(out var player))
            {
                player.AddKill();
            }

            if (coinPrefab == null || CoinValue <= 0)
            {
                return;
            }

            var coin = Instantiate(coinPrefab, transform.position, Quaternion.identity);
            coin.Configure(CoinValue);
        }
    }
}
