using RangerDanger.Data;
using RangerDanger.Grid;
using UnityEngine;

namespace RangerDanger.Core
{
    public sealed class GameSession : MonoBehaviour
    {
        [SerializeField] private GameBalance balance;
        [SerializeField] private LevelCatalog levels;
        [SerializeField] private GridOccupancy grid;

        public GameBalance Balance => balance;
        public LevelCatalog Levels => levels;
        public GridOccupancy Grid => grid;

        private void Awake()
        {
            Application.targetFrameRate = 120;
        }
    }
}
