using System.Collections.Generic;
using UnityEngine;

namespace RangerDanger.Grid
{
    public sealed class SparseGrid
    {
        private readonly Dictionary<Vector2Int, GridCell> cells = new();

        public GridCell Get(Vector2Int position)
        {
            return cells.TryGetValue(position, out var value) ? value : GridCell.Walkable;
        }

        public void Set(Vector2Int position, GridCell value)
        {
            if (value == GridCell.Walkable)
            {
                cells.Remove(position);
                return;
            }

            cells[position] = value;
        }

        public bool IsWalkable(Vector2Int position)
        {
            var value = Get(position);
            return value == GridCell.Walkable || value == GridCell.Bridge;
        }

        public bool IsFullySolid(Vector2Int position)
        {
            var value = Get(position);
            return value == GridCell.Wall || value == GridCell.Tree || value == GridCell.Water;
        }
    }
}
