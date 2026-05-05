# Ranger Danger Unity Port

This folder is the Unity rewrite track for Ranger Danger. The Phaser/Vite game remains at the repository root as the reference implementation while this project grows into the Steam/console-focused build.

## Target

- Unity 6.3 LTS or newer Unity 6 LTS
- 2D URP project
- Controller-first PC/console input
- Mobile support later through a separate input/presentation layer

## First Milestone

- Meadow vertical slice
- Player movement and aiming
- Sparse tile occupancy grid
- BFS enemy pathing
- One enemy type
- One tower type
- Basic wave spawning
- Projectile pooling can be added after behavior is validated

## Phaser Source Map

- `src/config.ts` -> `Assets/Scripts/Data/GameBalance.cs`
- `src/levels.ts` -> `Assets/Scripts/Data/LevelCatalog.cs`
- `src/systems/Pathfinding.ts` -> `Assets/Scripts/Grid/SparseGrid.cs` and `Pathfinder.cs`
- `src/entities/Player.ts` -> `Assets/Scripts/Entities/PlayerController.cs`
- `src/entities/Enemy.ts` -> `Assets/Scripts/Entities/EnemyController.cs`
- `src/entities/Tower.ts` -> `Assets/Scripts/Towers/TowerController.cs`
- `src/scenes/GameScene.ts` -> split across managers/controllers

## Opening In Unity

Open `Unity/RangerDangerUnity` from Unity Hub. Unity will generate editor metadata and solution files locally; those are ignored by git.
