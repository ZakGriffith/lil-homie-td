using UnityEngine;

namespace RangerDanger.Grid
{
    public sealed class GridOccupancy : MonoBehaviour
    {
        [SerializeField] private float tileWorldSize = 1f;

        public SparseGrid Cells { get; } = new();
        public int Version { get; private set; }

        public Vector2Int WorldToCell(Vector2 worldPosition)
        {
            return new Vector2Int(
                Mathf.FloorToInt(worldPosition.x / tileWorldSize),
                Mathf.FloorToInt(worldPosition.y / tileWorldSize));
        }

        public Vector2 CellToWorldCenter(Vector2Int cell)
        {
            return new Vector2((cell.x + 0.5f) * tileWorldSize, (cell.y + 0.5f) * tileWorldSize);
        }

        public bool CanPlaceFootprint(Vector2Int origin, Vector2Int size)
        {
            for (var y = 0; y < size.y; y++)
            {
                for (var x = 0; x < size.x; x++)
                {
                    if (!Cells.IsWalkable(origin + new Vector2Int(x, y)))
                    {
                        return false;
                    }
                }
            }

            return true;
        }

        public void SetFootprint(Vector2Int origin, Vector2Int size, GridCell value)
        {
            for (var y = 0; y < size.y; y++)
            {
                for (var x = 0; x < size.x; x++)
                {
                    Cells.Set(origin + new Vector2Int(x, y), value);
                }
            }

            Version++;
        }
    }
}
