using UnityEngine;

namespace RangerDanger.Data
{
    public enum TowerKind
    {
        Arrow,
        Cannon
    }

    public enum EnemyKind
    {
        Snake,
        Rat,
        Deer
    }

    [System.Serializable]
    public struct PlayerBalance
    {
        public int hp;
        public float speed;
        public float fireRateSeconds;
        public float range;
        public float projectileSpeed;
        public int damage;
    }

    [System.Serializable]
    public struct EnemyBalance
    {
        public EnemyKind kind;
        public int hp;
        public float speed;
        public int damage;
        public int coin;
    }

    [System.Serializable]
    public struct TowerLevelBalance
    {
        public int hp;
        public float fireRateSeconds;
        public float range;
        public int damage;
        public float projectileSpeed;
        public float splashRadius;
        public int upgradeCost;
    }

    [System.Serializable]
    public struct TowerBalance
    {
        public TowerKind kind;
        public int cost;
        public TowerLevelBalance[] levels;
    }

    [CreateAssetMenu(menuName = "Ranger Danger/Game Balance")]
    public sealed class GameBalance : ScriptableObject
    {
        public const float TilePixels = 32f;

        [Header("World")]
        public int tileSizePixels = 32;
        public int spawnDistanceTiles = 18;
        public int chunkSizeTiles = 16;

        [Header("Economy")]
        public int startMoney = 130;
        public int wallCost = 3;
        public int wallHp = 80;

        [Header("Actors")]
        public PlayerBalance player = new()
        {
            hp = 100,
            speed = 150f / TilePixels,
            fireRateSeconds = 0.48f,
            range = 240f / TilePixels,
            projectileSpeed = 520f / TilePixels,
            damage = 10
        };

        public EnemyBalance[] enemies =
        {
            new() { kind = EnemyKind.Snake, hp = 18, speed = 55f / TilePixels, damage = 7, coin = 1 },
            new() { kind = EnemyKind.Rat, hp = 10, speed = 130f / TilePixels, damage = 4, coin = 1 },
            new() { kind = EnemyKind.Deer, hp = 40, speed = 35f / TilePixels, damage = 12, coin = 2 }
        };

        public TowerBalance[] towers =
        {
            new()
            {
                kind = TowerKind.Arrow,
                cost = 60,
                levels = new[]
                {
                    new TowerLevelBalance { hp = 120, fireRateSeconds = 0.62f, range = 240f / TilePixels, damage = 20, projectileSpeed = 480f / TilePixels, splashRadius = 0f, upgradeCost = 60 },
                    new TowerLevelBalance { hp = 170, fireRateSeconds = 0.46f, range = 270f / TilePixels, damage = 30, projectileSpeed = 580f / TilePixels, splashRadius = 0f, upgradeCost = 110 },
                    new TowerLevelBalance { hp = 240, fireRateSeconds = 0.32f, range = 300f / TilePixels, damage = 42, projectileSpeed = 700f / TilePixels, splashRadius = 0f, upgradeCost = 0 }
                }
            },
            new()
            {
                kind = TowerKind.Cannon,
                cost = 60,
                levels = new[]
                {
                    new TowerLevelBalance { hp = 180, fireRateSeconds = 1.4f, range = 220f / TilePixels, damage = 15, projectileSpeed = 200f / TilePixels, splashRadius = 48f / TilePixels, upgradeCost = 60 },
                    new TowerLevelBalance { hp = 250, fireRateSeconds = 1.1f, range = 240f / TilePixels, damage = 22, projectileSpeed = 280f / TilePixels, splashRadius = 58f / TilePixels, upgradeCost = 110 },
                    new TowerLevelBalance { hp = 340, fireRateSeconds = 0.85f, range = 260f / TilePixels, damage = 32, projectileSpeed = 360f / TilePixels, splashRadius = 72f / TilePixels, upgradeCost = 0 }
                }
            }
        };

        [Header("Waves")]
        public float startDelaySeconds = 10f;
        public float initialSpawnIntervalSeconds = 2.6f;
        public float minSpawnIntervalSeconds = 0.35f;
        public float rampEverySeconds = 12f;
        public float rampFactor = 0.93f;
        public int waveSize = 100;
        public int waveCount = 2;
        public float waveBreakSeconds = 15f;

        public EnemyBalance GetEnemy(EnemyKind kind)
        {
            foreach (var enemy in enemies)
            {
                if (enemy.kind == kind)
                {
                    return enemy;
                }
            }

            return enemies.Length > 0 ? enemies[0] : default;
        }

        public TowerBalance GetTower(TowerKind kind)
        {
            foreach (var tower in towers)
            {
                if (tower.kind == kind)
                {
                    return tower;
                }
            }

            return towers.Length > 0 ? towers[0] : default;
        }
    }
}
