using RangerDanger.Data;
using RangerDanger.Grid;
using RangerDanger.Input;
using RangerDanger.Entities;
using UnityEngine;

namespace RangerDanger.Towers
{
    public sealed class TowerBuilder : MonoBehaviour
    {
        [SerializeField] private GameBalance balance;
        [SerializeField] private GridOccupancy grid;
        [SerializeField] private TowerController towerPrefab;
        [SerializeField] private PlayerController player;
        [SerializeField] private float placementDistance = 1.25f;

        private Vector2 lastBuildDirection = Vector2.right;

        public void Configure(GameBalance gameBalance, GridOccupancy occupancy, TowerController prefab, PlayerController owner)
        {
            balance = gameBalance;
            grid = occupancy;
            towerPrefab = prefab;
            player = owner;
        }

        private void Update()
        {
            var move = PlayerInputReader.Move;
            if (move.sqrMagnitude > 0.001f)
            {
                lastBuildDirection = move.normalized;
            }

            if (!PlayerInputReader.ConsumeBuildPressed())
            {
                return;
            }

            TryPlaceTower();
        }

        private void TryPlaceTower()
        {
            if (balance == null || grid == null || towerPrefab == null || player == null)
            {
                Debug.LogWarning("Cannot place tower because TowerBuilder is missing balance, grid, tower prefab, or player.", this);
                return;
            }

            var tower = balance.GetTower(TowerKind.Arrow);
            if (!player.Spend(tower.cost))
            {
                Debug.Log("Not enough money to place arrow tower.", this);
                return;
            }

            var targetCell = grid.WorldToCell((Vector2)transform.position + lastBuildDirection * placementDistance);
            var footprint = Vector2Int.one;
            if (!grid.CanPlaceFootprint(targetCell, footprint))
            {
                player.AddMoney(tower.cost);
                Debug.Log("Cannot place arrow tower on an occupied cell.", this);
                return;
            }

            var instance = Instantiate(towerPrefab, grid.CellToWorldCenter(targetCell), Quaternion.identity);
            instance.Configure(balance, TowerKind.Arrow, 0);
            grid.SetFootprint(targetCell, footprint, GridCell.Tower);
            Debug.Log($"Placed arrow tower at {targetCell}.", instance);
        }
    }
}
