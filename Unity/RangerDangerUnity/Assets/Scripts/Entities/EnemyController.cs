using System.Collections.Generic;
using RangerDanger.Data;
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

        private readonly List<Vector2Int> path = new();
        private Rigidbody2D body;
        private Damageable damageable;
        private GameBalance balance;
        private GridOccupancy grid;
        private Transform target;
        private EnemyBalance stats;
        private int pathIndex;
        private float nextRepathAt;

        public EnemyKind Kind => kind;
        public int CoinValue => stats.coin;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            damageable = GetComponent<Damageable>();
        }

        public void Configure(GameBalance gameBalance, GridOccupancy occupancy, Transform targetTransform, EnemyKind enemyKind)
        {
            balance = gameBalance;
            grid = occupancy;
            target = targetTransform;
            kind = enemyKind;
            stats = balance.GetEnemy(kind);
            damageable.Configure(stats.hp);
            nextRepathAt = 0f;
            path.Clear();
        }

        private void FixedUpdate()
        {
            if (target == null || grid == null || damageable.IsDead)
            {
                body.velocity = Vector2.zero;
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

        private void FollowPath()
        {
            if (pathIndex >= path.Count)
            {
                body.velocity = Vector2.zero;
                return;
            }

            var waypoint = grid.CellToWorldCenter(path[pathIndex]);
            var delta = waypoint - (Vector2)transform.position;
            if (delta.magnitude <= waypointTolerance)
            {
                pathIndex++;
                return;
            }

            body.velocity = delta.normalized * stats.speed;
        }
    }
}
