using RangerDanger.Data;
using RangerDanger.Entities;
using RangerDanger.Grid;
using UnityEngine;

namespace RangerDanger.Waves
{
    public sealed class WaveDirector : MonoBehaviour
    {
        [SerializeField] private GameBalance balance;
        [SerializeField] private EnemyController enemyPrefab;
        [SerializeField] private GridOccupancy grid;
        [SerializeField] private Transform player;

        private float nextSpawnAt;
        private float spawnInterval;
        private float nextRampAt;
        private int spawnedThisWave;
        private int waveIndex;
        private bool started;

        private void Start()
        {
            if (balance == null)
            {
                enabled = false;
                return;
            }

            spawnInterval = balance.initialSpawnIntervalSeconds;
            nextSpawnAt = Time.time + balance.startDelaySeconds;
            nextRampAt = Time.time + balance.rampEverySeconds;
            started = true;
        }

        private void Update()
        {
            if (!started || enemyPrefab == null || player == null || grid == null)
            {
                return;
            }

            if (Time.time >= nextRampAt)
            {
                nextRampAt = Time.time + balance.rampEverySeconds;
                spawnInterval = Mathf.Max(balance.minSpawnIntervalSeconds, spawnInterval * balance.rampFactor);
            }

            if (spawnedThisWave >= balance.waveSize || Time.time < nextSpawnAt)
            {
                return;
            }

            SpawnEnemy();
            spawnedThisWave++;
            nextSpawnAt = Time.time + spawnInterval;
        }

        private void SpawnEnemy()
        {
            var angle = Random.Range(0f, Mathf.PI * 2f);
            var distance = balance.spawnDistanceTiles;
            var position = (Vector2)player.position + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * distance;
            var enemy = Instantiate(enemyPrefab, position, Quaternion.identity);

            var roll = Random.value;
            var kind = roll < 0.2f ? EnemyKind.Deer : roll < 0.55f ? EnemyKind.Rat : EnemyKind.Snake;
            enemy.Configure(balance, grid, player, kind);
        }
    }
}
