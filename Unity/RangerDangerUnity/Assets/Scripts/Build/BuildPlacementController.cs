using RangerDanger.Data;
using RangerDanger.Entities;
using RangerDanger.Grid;
using RangerDanger.Towers;
using UnityEngine;
using UnityEngine.InputSystem;

namespace RangerDanger.Build
{
    public sealed class BuildPlacementController : MonoBehaviour
    {
        private enum BuildItem
        {
            None,
            ArrowTower,
            Wall
        }

        [SerializeField] private GameBalance balance;
        [SerializeField] private GridOccupancy grid;
        [SerializeField] private PlayerController player;
        [SerializeField] private TowerController arrowTowerPrefab;
        [SerializeField] private Combat.Projectile projectilePrefab;
        [SerializeField] private GameObject wallPrefab;

        private readonly Vector2Int footprint = Vector2Int.one;
        private static readonly Vector2Int[] PathSamples =
        {
            new(1, 0),
            new(1, 1),
            new(0, 1),
            new(-1, 1),
            new(-1, 0),
            new(-1, -1),
            new(0, -1),
            new(1, -1)
        };

        private BuildItem selectedItem = BuildItem.ArrowTower;
        private SpriteRenderer ghostRenderer;
        private Vector2Int hoveredCell;
        private TowerController selectedTower;
        private Vector2Int selectedTowerCell;
        private bool hasHover;
        private Rect hotbarRect = new Rect(12f, 12f, 330f, 78f);
        private Rect towerPanelRect = new Rect(12f, 98f, 230f, 108f);

        public void Configure(GameBalance gameBalance, GridOccupancy occupancy, PlayerController owner, TowerController towerPrefab, Combat.Projectile projectilePrototype, GameObject wallPrototype)
        {
            balance = gameBalance;
            grid = occupancy;
            player = owner;
            arrowTowerPrefab = towerPrefab;
            projectilePrefab = projectilePrototype;
            wallPrefab = wallPrototype;
        }

        private void Awake()
        {
            var ghost = new GameObject("Build Ghost");
            ghostRenderer = ghost.AddComponent<SpriteRenderer>();
            ghostRenderer.sortingOrder = 25;
            ghost.SetActive(false);
        }

        private void Update()
        {
            UpdateHover();
            UpdateGhost();

            var mouse = Mouse.current;
            if (mouse == null || !mouse.leftButton.wasPressedThisFrame || IsMouseOverHotbar())
            {
                return;
            }

            if (TrySelectTowerUnderMouse())
            {
                return;
            }

            TryPlaceSelected();
        }

        private void OnGUI()
        {
            GUI.Box(hotbarRect, "");

            GUI.Label(new Rect(24f, 18f, 120f, 20f), $"Money: {player?.Money ?? 0}");
            DrawHotbarButton(new Rect(24f, 44f, 132f, 32f), BuildItem.ArrowTower, $"Arrow ${GetArrowCost()}");
            DrawHotbarButton(new Rect(166f, 44f, 92f, 32f), BuildItem.Wall, $"Wall ${GetWallCost()}");

            if (GUI.Button(new Rect(270f, 44f, 58f, 32f), "Cancel"))
            {
                selectedItem = BuildItem.None;
                selectedTower = null;
            }

            DrawTowerPanel();
        }

        private void DrawTowerPanel()
        {
            if (selectedTower == null)
            {
                return;
            }

            GUI.Box(towerPanelRect, "");
            GUI.Label(new Rect(24f, 106f, 190f, 20f), $"Arrow Tower L{selectedTower.LevelIndex + 1}");

            var upgradeCost = selectedTower.GetUpgradeCost();
            GUI.enabled = selectedTower.CanUpgrade() && player != null && player.Money >= upgradeCost;
            if (GUI.Button(new Rect(24f, 132f, 100f, 30f), selectedTower.CanUpgrade() ? $"Upgrade ${upgradeCost}" : "Max Level"))
            {
                TryUpgradeSelectedTower();
            }

            GUI.enabled = true;
            if (GUI.Button(new Rect(132f, 132f, 86f, 30f), $"Sell ${selectedTower.GetSellRefund()}"))
            {
                SellSelectedTower();
            }

            if (GUI.Button(new Rect(24f, 168f, 194f, 26f), "Close"))
            {
                selectedTower = null;
            }
        }

        private void DrawHotbarButton(Rect rect, BuildItem item, string label)
        {
            var previous = GUI.color;
            GUI.color = selectedItem == item ? new Color(0.65f, 1f, 0.72f) : Color.white;
            if (GUI.Button(rect, label))
            {
                selectedItem = item;
                selectedTower = null;
            }

            GUI.color = previous;
        }

        private void UpdateHover()
        {
            hasHover = false;
            var camera = Camera.main;
            var mouse = Mouse.current;
            if (camera == null || mouse == null || grid == null)
            {
                return;
            }

            var screen = mouse.position.ReadValue();
            var world = camera.ScreenToWorldPoint(new Vector3(screen.x, screen.y, -camera.transform.position.z));
            hoveredCell = grid.WorldToCell(world);
            hasHover = true;
        }

        private void UpdateGhost()
        {
            if (ghostRenderer == null)
            {
                return;
            }

            if (!hasHover || selectedItem == BuildItem.None || IsMouseOverHotbar())
            {
                ghostRenderer.gameObject.SetActive(false);
                return;
            }

            ghostRenderer.gameObject.SetActive(true);
            ghostRenderer.transform.position = grid.CellToWorldCenter(hoveredCell);
            ghostRenderer.sprite = GetSelectedSprite();
            ghostRenderer.color = CanPlaceSelected() ? new Color(0.35f, 1f, 0.35f, 0.55f) : new Color(1f, 0.25f, 0.25f, 0.55f);
        }

        private bool IsMouseOverHotbar()
        {
            var mouse = Mouse.current;
            if (mouse == null)
            {
                return false;
            }

            var position = mouse.position.ReadValue();
            var guiPosition = new Vector2(position.x, Screen.height - position.y);
            return hotbarRect.Contains(guiPosition);
        }

        private bool IsMouseOverTowerPanel()
        {
            var mouse = Mouse.current;
            if (mouse == null || selectedTower == null)
            {
                return false;
            }

            var position = mouse.position.ReadValue();
            var guiPosition = new Vector2(position.x, Screen.height - position.y);
            return towerPanelRect.Contains(guiPosition);
        }

        private bool TrySelectTowerUnderMouse()
        {
            if (!hasHover || IsMouseOverTowerPanel())
            {
                return false;
            }

            var hit = Physics2D.OverlapPoint(grid.CellToWorldCenter(hoveredCell));
            if (hit == null || !hit.TryGetComponent<TowerController>(out var tower))
            {
                return false;
            }

            selectedTower = tower;
            selectedTowerCell = hoveredCell;
            selectedItem = BuildItem.None;
            return true;
        }

        private void TryPlaceSelected()
        {
            if (IsMouseOverTowerPanel() || !CanPlaceSelected())
            {
                return;
            }

            if (selectedItem == BuildItem.ArrowTower)
            {
                PlaceArrowTower();
                return;
            }

            PlaceWall();
        }

        private bool CanPlaceSelected()
        {
            if (selectedItem == BuildItem.None || !hasHover || balance == null || grid == null || player == null || IsMouseOverHotbar() || !grid.CanPlaceFootprint(hoveredCell, footprint))
            {
                return false;
            }

            var cellCenter = grid.CellToWorldCenter(hoveredCell);
            if (((Vector2)player.transform.position - cellCenter).sqrMagnitude < 0.7f * 0.7f)
            {
                return false;
            }

            return player.Money >= GetSelectedCost() && WouldPreserveEnemyAccess();
        }

        private bool WouldPreserveEnemyAccess()
        {
            var previous = grid.Cells.Get(hoveredCell);
            var placedCell = selectedItem == BuildItem.ArrowTower ? GridCell.Tower : GridCell.Wall;
            grid.Cells.Set(hoveredCell, placedCell);
            var hasPath = HasAnySpawnPathToPlayer();
            grid.Cells.Set(hoveredCell, previous);
            return hasPath;
        }

        private bool HasAnySpawnPathToPlayer()
        {
            var target = grid.WorldToCell(player.transform.position);
            var distance = balance != null ? Mathf.Max(2, balance.spawnDistanceTiles) : 8;

            foreach (var sample in PathSamples)
            {
                var world = (Vector2)player.transform.position + ((Vector2)sample).normalized * distance;
                var start = grid.WorldToCell(world);
                if (!grid.Cells.IsWalkable(start))
                {
                    continue;
                }

                if (start == target || Pathfinder.FindPath(grid.Cells, start, target, distance + 16).Count > 0)
                {
                    return true;
                }
            }

            return false;
        }

        private void PlaceArrowTower()
        {
            if (arrowTowerPrefab == null || !player.Spend(GetArrowCost()))
            {
                return;
            }

            var instance = Instantiate(arrowTowerPrefab, grid.CellToWorldCenter(hoveredCell), Quaternion.identity);
            instance.Configure(balance, TowerKind.Arrow, 0, projectilePrefab, GetArrowCost());
            grid.SetFootprint(hoveredCell, footprint, GridCell.Tower);
            selectedTower = instance;
            selectedTowerCell = hoveredCell;
            selectedItem = BuildItem.None;
        }

        private void PlaceWall()
        {
            if (wallPrefab == null || !player.Spend(GetWallCost()))
            {
                return;
            }

            Instantiate(wallPrefab, grid.CellToWorldCenter(hoveredCell), Quaternion.identity);
            grid.SetFootprint(hoveredCell, footprint, GridCell.Wall);
        }

        private void TryUpgradeSelectedTower()
        {
            if (selectedTower == null || player == null)
            {
                return;
            }

            var cost = selectedTower.GetUpgradeCost();
            if (cost <= 0 || !player.Spend(cost))
            {
                return;
            }

            selectedTower.Upgrade();
        }

        private void SellSelectedTower()
        {
            if (selectedTower == null || player == null || grid == null)
            {
                return;
            }

            player.AddMoney(selectedTower.GetSellRefund());
            grid.SetFootprint(selectedTowerCell, footprint, GridCell.Walkable);
            Destroy(selectedTower.gameObject);
            selectedTower = null;
        }

        private Sprite GetSelectedSprite()
        {
            if (selectedItem == BuildItem.ArrowTower && arrowTowerPrefab != null && arrowTowerPrefab.TryGetComponent<SpriteRenderer>(out var towerRenderer))
            {
                return towerRenderer.sprite;
            }

            if (selectedItem == BuildItem.Wall && wallPrefab != null && wallPrefab.TryGetComponent<SpriteRenderer>(out var wallRenderer))
            {
                return wallRenderer.sprite;
            }

            return null;
        }

        private int GetSelectedCost()
        {
            return selectedItem == BuildItem.ArrowTower ? GetArrowCost() : selectedItem == BuildItem.Wall ? GetWallCost() : 0;
        }

        private int GetArrowCost()
        {
            return balance != null ? balance.GetTower(TowerKind.Arrow).cost : 0;
        }

        private int GetWallCost()
        {
            return balance != null ? balance.wallCost : 0;
        }
    }
}
