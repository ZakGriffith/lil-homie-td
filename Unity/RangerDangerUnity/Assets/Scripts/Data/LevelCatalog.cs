using UnityEngine;

namespace RangerDanger.Data
{
    public enum Difficulty
    {
        Easy,
        Medium,
        Hard,
        OneHp
    }

    public enum Biome
    {
        Grasslands,
        Forest,
        Infected,
        River,
        Castle,
        Desert,
        Tundra,
        Volcanic
    }

    [System.Serializable]
    public sealed class LevelDefinition
    {
        public int id;
        public string levelName = "";
        public Biome biome;
        public Vector2 mapPosition;
        public int[] connectsTo = System.Array.Empty<int>();
        public int unlockCost;
        public bool implemented;
        public float rampFactor = 0.93f;
        public float minIntervalSeconds = 0.35f;
        public int waveSize = 100;
        public int clusterMax = 4;
    }

    [CreateAssetMenu(menuName = "Ranger Danger/Level Catalog")]
    public sealed class LevelCatalog : ScriptableObject
    {
        public LevelDefinition[] levels =
        {
            new()
            {
                id = 1,
                levelName = "Meadow",
                biome = Biome.Grasslands,
                mapPosition = new Vector2(150, 345),
                connectsTo = new[] { 2 },
                unlockCost = 0,
                implemented = true,
                rampFactor = 0.93f,
                minIntervalSeconds = 0.35f,
                waveSize = 100,
                clusterMax = 4
            }
        };
    }
}
