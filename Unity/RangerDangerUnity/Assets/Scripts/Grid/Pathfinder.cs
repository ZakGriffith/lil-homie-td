using System.Collections.Generic;
using UnityEngine;

namespace RangerDanger.Grid
{
    public static class Pathfinder
    {
        private static readonly Vector2Int[] Cardinals =
        {
            new(1, 0),
            new(-1, 0),
            new(0, 1),
            new(0, -1)
        };

        private static readonly Vector2Int[] Diagonals =
        {
            new(1, 1),
            new(-1, 1),
            new(1, -1),
            new(-1, -1)
        };

        public static List<Vector2Int> FindPath(SparseGrid grid, Vector2Int start, Vector2Int target, int padding = 20)
        {
            var minX = Mathf.Min(start.x, target.x) - padding;
            var maxX = Mathf.Max(start.x, target.x) + padding;
            var minY = Mathf.Min(start.y, target.y) - padding;
            var maxY = Mathf.Max(start.y, target.y) + padding;

            if (!InRange(start, minX, maxX, minY, maxY))
            {
                return new List<Vector2Int>();
            }

            var queue = new Queue<Vector2Int>();
            var visited = new HashSet<Vector2Int>();
            var previous = new Dictionary<Vector2Int, Vector2Int>();

            queue.Enqueue(start);
            visited.Add(start);

            var found = false;
            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (current == target)
                {
                    found = true;
                    break;
                }

                foreach (var offset in Cardinals)
                {
                    TryVisit(grid, current, current + offset, false, minX, maxX, minY, maxY, visited, previous, queue);
                }

                foreach (var offset in Diagonals)
                {
                    TryVisit(grid, current, current + offset, true, minX, maxX, minY, maxY, visited, previous, queue);
                }
            }

            if (!found)
            {
                return new List<Vector2Int>();
            }

            var path = new List<Vector2Int>();
            var step = target;
            while (step != start)
            {
                path.Add(step);
                step = previous[step];
            }

            path.Reverse();
            return path;
        }

        private static void TryVisit(
            SparseGrid grid,
            Vector2Int current,
            Vector2Int next,
            bool diagonal,
            int minX,
            int maxX,
            int minY,
            int maxY,
            HashSet<Vector2Int> visited,
            Dictionary<Vector2Int, Vector2Int> previous,
            Queue<Vector2Int> queue)
        {
            if (!InRange(next, minX, maxX, minY, maxY) || visited.Contains(next) || !grid.IsWalkable(next))
            {
                return;
            }

            if (diagonal)
            {
                var xLeg = new Vector2Int(next.x, current.y);
                var yLeg = new Vector2Int(current.x, next.y);
                if (grid.IsFullySolid(xLeg) || grid.IsFullySolid(yLeg))
                {
                    return;
                }

                if (grid.Get(xLeg) != GridCell.Walkable && grid.Get(yLeg) != GridCell.Walkable)
                {
                    return;
                }
            }

            visited.Add(next);
            previous[next] = current;
            queue.Enqueue(next);
        }

        private static bool InRange(Vector2Int value, int minX, int maxX, int minY, int maxY)
        {
            return value.x >= minX && value.x <= maxX && value.y >= minY && value.y <= maxY;
        }
    }
}
