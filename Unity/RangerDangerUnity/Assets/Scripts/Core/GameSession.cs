using RangerDanger.Data;
using RangerDanger.Entities;
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

        public void Configure(GameBalance gameBalance, LevelCatalog levelCatalog, GridOccupancy occupancy)
        {
            balance = gameBalance;
            levels = levelCatalog;
            grid = occupancy;
        }

        private void Awake()
        {
            Application.targetFrameRate = 120;
            EnsureCameraFollow();
        }

        private void EnsureCameraFollow()
        {
            var camera = Camera.main;
            var player = Object.FindFirstObjectByType<PlayerController>();
            if (camera == null || player == null)
            {
                return;
            }

            if (!camera.TryGetComponent<CameraFollow>(out var follow))
            {
                follow = camera.gameObject.AddComponent<CameraFollow>();
            }

            follow.Configure(player.transform);
        }
    }
}
