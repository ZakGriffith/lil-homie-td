using System.IO;
using System.Linq;
using RangerDanger.Build;
using RangerDanger.Combat;
using RangerDanger.Core;
using RangerDanger.Data;
using RangerDanger.Economy;
using RangerDanger.Entities;
using RangerDanger.Grid;
using RangerDanger.Input;
using RangerDanger.Towers;
using RangerDanger.Waves;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;

namespace RangerDanger.Editor
{
    public static class VerticalSliceSceneBuilder
    {
        private const string GeneratedPath = "Assets/Generated";
        private const string ScenesPath = "Assets/Scenes";
        private const string GeneratedSpritesPath = "Assets/Generated/Sprites";

        [MenuItem("Ranger Danger/Build Meadow Vertical Slice")]
        public static void Build()
        {
            Directory.CreateDirectory(GeneratedPath);
            Directory.CreateDirectory(ScenesPath);
            Directory.CreateDirectory(GeneratedSpritesPath);

            var balance = LoadOrCreateAsset<GameBalance>($"{GeneratedPath}/GameBalance.asset");
            var levels = LoadOrCreateAsset<LevelCatalog>($"{GeneratedPath}/LevelCatalog.asset");
            ConfigureSmokeTestBalance(balance);
            AssetDatabase.SaveAssets();

            var enemyPrefab = CreateEnemyPrefab(balance);
            var projectilePrefab = CreateProjectilePrefab();
            var towerPrefab = CreateTowerPrefab(balance, projectilePrefab);
            var wallPrefab = CreateWallPrefab();
            var coinPrefab = CreateCoinPrefab();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(0f, 0f, -10f);
            var camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 8f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.12f, 0.2f, 0.11f);
            var cameraFollow = cameraObject.AddComponent<CameraFollow>();

            var gridObject = new GameObject("Grid Occupancy");
            var grid = gridObject.AddComponent<GridOccupancy>();

            var sessionObject = new GameObject("Game Session");
            var session = sessionObject.AddComponent<RangerDanger.Core.GameSession>();
            session.Configure(balance, levels, grid);
            EditorUtility.SetDirty(session);

            var player = CreateActor("Player", new Color(0.25f, 0.55f, 0.95f), Vector2.zero, new Vector2(0.55f, 0.75f));
            var projectileSpawn = new GameObject("Projectile Spawn").transform;
            projectileSpawn.SetParent(player.transform);
            projectileSpawn.localPosition = new Vector3(0.65f, 0f, 0f);
            player.AddComponent<PlayerController>().Configure(balance, projectilePrefab, projectileSpawn);
            var playerController = player.GetComponent<PlayerController>();
            player.AddComponent<Damageable>().Configure(balance.player.hp);
            CreateHealthLabel(player);
            EditorUtility.SetDirty(player);
            cameraFollow.Configure(player.transform);
            EditorUtility.SetDirty(cameraFollow);

            CreateInput(player);

            var buildObject = new GameObject("Build Placement");
            var placement = buildObject.AddComponent<BuildPlacementController>();
            placement.Configure(balance, grid, playerController, towerPrefab, projectilePrefab, wallPrefab);
            EditorUtility.SetDirty(placement);

            var waveObject = new GameObject("Wave Director");
            var wave = waveObject.AddComponent<WaveDirector>();
            wave.Configure(balance, enemyPrefab, grid, player.transform, coinPrefab);
            EditorUtility.SetDirty(wave);

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, $"{ScenesPath}/MeadowVerticalSlice.unity");
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Selection.activeObject = player;
        }

        private static void CreateInput(GameObject player)
        {
            var inputObject = new GameObject("Player Input");
            var bridge = inputObject.AddComponent<PlayerInputBridge>();
            var input = inputObject.AddComponent<PlayerInput>();
            var actions = AssetDatabase.LoadAssetAtPath<InputActionAsset>("Assets/InputActions/RangerDanger.inputactions");
            if (actions == null)
            {
                Debug.LogWarning("Could not load Assets/InputActions/RangerDanger.inputactions; WASD input will not be wired.");
                return;
            }

            input.actions = actions;
            input.defaultActionMap = "Gameplay";
            input.notificationBehavior = PlayerNotifications.SendMessages;
            input.camera = Camera.main;
            input.ActivateInput();

            EditorUtility.SetDirty(bridge);
            EditorUtility.SetDirty(input);
            Selection.activeGameObject = player;
        }

        private static void CreateHealthLabel(GameObject player)
        {
            var damageable = player.GetComponent<Damageable>();
            var labelObject = new GameObject("Health Label");
            labelObject.transform.SetParent(player.transform);
            labelObject.transform.localPosition = new Vector3(0f, 0.9f, 0f);

            var text = labelObject.AddComponent<TextMesh>();
            text.text = $"HP {damageable.Hp}/{damageable.MaxHp}";
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.characterSize = 0.22f;
            text.color = Color.white;

            var renderer = labelObject.GetComponent<MeshRenderer>();
            if (renderer == null)
            {
                renderer = labelObject.AddComponent<MeshRenderer>();
            }

            renderer.sortingOrder = 30;

            var label = labelObject.AddComponent<HealthLabel>();
            label.Configure(damageable);

            EditorUtility.SetDirty(labelObject);
            EditorUtility.SetDirty(text);
            EditorUtility.SetDirty(label);
        }

        private static void ConfigureSmokeTestBalance(GameBalance balance)
        {
            balance.spawnDistanceTiles = 4;
            balance.startDelaySeconds = 0.35f;
            balance.initialSpawnIntervalSeconds = 0.45f;
            balance.minSpawnIntervalSeconds = 0.2f;
            balance.rampEverySeconds = 6f;
            EditorUtility.SetDirty(balance);
        }

        private static EnemyController CreateEnemyPrefab(GameBalance balance)
        {
            var prefabPath = $"{GeneratedPath}/EnemyPrototype.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<EnemyController>(prefabPath);
            if (existing != null)
            {
                EnsureActorSprite(existing.gameObject, "EnemyPrototype", new Color(0.75f, 0.22f, 0.16f));
                PrefabUtility.SavePrefabAsset(existing.gameObject);
                return existing;
            }

            var enemy = CreateActor("EnemyPrototype", new Color(0.75f, 0.22f, 0.16f), Vector2.zero, new Vector2(0.55f, 0.55f));
            enemy.AddComponent<Damageable>();
            var controller = enemy.AddComponent<EnemyController>();
            var prefab = PrefabUtility.SaveAsPrefabAsset(enemy, prefabPath).GetComponent<EnemyController>();
            Object.DestroyImmediate(enemy);
            return prefab;
        }

        private static Projectile CreateProjectilePrefab()
        {
            var prefabPath = $"{GeneratedPath}/PlayerProjectile.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<Projectile>(prefabPath);
            if (existing != null)
            {
                EnsureActorSprite(existing.gameObject, "PlayerProjectile", new Color(1f, 0.86f, 0.18f));
                EnsureProjectilePhysics(existing.gameObject);
                PrefabUtility.SavePrefabAsset(existing.gameObject);
                return existing;
            }

            var projectile = CreateActor("PlayerProjectile", new Color(1f, 0.86f, 0.18f), Vector2.zero, new Vector2(0.22f, 0.22f));
            EnsureProjectilePhysics(projectile);
            var controller = projectile.AddComponent<Projectile>();
            var prefab = PrefabUtility.SaveAsPrefabAsset(projectile, prefabPath).GetComponent<Projectile>();
            Object.DestroyImmediate(projectile);
            return prefab;
        }

        private static TowerController CreateTowerPrefab(GameBalance balance, Projectile projectilePrefab)
        {
            var prefabPath = $"{GeneratedPath}/ArrowTower.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<TowerController>(prefabPath);
            if (existing != null)
            {
                EnsureActorSprite(existing.gameObject, "ArrowTower", new Color(0.35f, 0.8f, 0.38f));
                existing.Configure(balance, TowerKind.Arrow, 0, projectilePrefab);
                PrefabUtility.SavePrefabAsset(existing.gameObject);
                return existing;
            }

            var tower = new GameObject("ArrowTower");
            var renderer = tower.AddComponent<SpriteRenderer>();
            renderer.sprite = LoadOrCreateSprite($"{GeneratedSpritesPath}/ArrowTower.png", new Color(0.35f, 0.8f, 0.38f));
            renderer.sortingOrder = 8;

            var collider = tower.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(0.85f, 0.85f);

            var controller = tower.AddComponent<TowerController>();
            controller.Configure(balance, TowerKind.Arrow, 0, projectilePrefab);

            var prefab = PrefabUtility.SaveAsPrefabAsset(tower, prefabPath).GetComponent<TowerController>();
            Object.DestroyImmediate(tower);
            return prefab;
        }

        private static GameObject CreateWallPrefab()
        {
            var prefabPath = $"{GeneratedPath}/Wall.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
            if (existing != null)
            {
                EnsureActorSprite(existing, "Wall", new Color(0.46f, 0.48f, 0.5f));
                EnsureWallPhysics(existing);
                PrefabUtility.SavePrefabAsset(existing);
                return existing;
            }

            var wall = new GameObject("Wall");
            var renderer = wall.AddComponent<SpriteRenderer>();
            renderer.sprite = LoadOrCreateSprite($"{GeneratedSpritesPath}/Wall.png", new Color(0.46f, 0.48f, 0.5f));
            renderer.sortingOrder = 7;
            EnsureWallPhysics(wall);

            var prefab = PrefabUtility.SaveAsPrefabAsset(wall, prefabPath);
            Object.DestroyImmediate(wall);
            return prefab;
        }

        private static CoinPickup CreateCoinPrefab()
        {
            var prefabPath = $"{GeneratedPath}/CoinPickup.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<CoinPickup>(prefabPath);
            if (existing != null)
            {
                EnsureActorSprite(existing.gameObject, "CoinPickup", new Color(1f, 0.76f, 0.12f));
                EnsureCoinPhysics(existing.gameObject);
                PrefabUtility.SavePrefabAsset(existing.gameObject);
                return existing;
            }

            var coin = new GameObject("CoinPickup");
            var renderer = coin.AddComponent<SpriteRenderer>();
            renderer.sprite = LoadOrCreateSprite($"{GeneratedSpritesPath}/CoinPickup.png", new Color(1f, 0.76f, 0.12f));
            renderer.sortingOrder = 12;
            EnsureCoinPhysics(coin);
            var pickup = coin.AddComponent<CoinPickup>();

            var prefab = PrefabUtility.SaveAsPrefabAsset(coin, prefabPath).GetComponent<CoinPickup>();
            Object.DestroyImmediate(coin);
            return prefab;
        }

        private static GameObject CreateActor(string name, Color color, Vector2 position, Vector2 size)
        {
            var actor = new GameObject(name);
            actor.transform.position = position;

            var renderer = actor.AddComponent<SpriteRenderer>();
            renderer.sprite = LoadOrCreateSprite($"{GeneratedSpritesPath}/{name}.png", color);
            renderer.sortingOrder = 10;

            var body = actor.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.freezeRotation = true;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;

            var collider = actor.AddComponent<CircleCollider2D>();
            collider.radius = Mathf.Max(size.x, size.y) * 0.45f;

            return actor;
        }

        private static void EnsureProjectilePhysics(GameObject projectile)
        {
            if (projectile.TryGetComponent<CircleCollider2D>(out var collider))
            {
                collider.isTrigger = true;
                collider.radius = 0.11f;
                EditorUtility.SetDirty(collider);
            }

            if (projectile.TryGetComponent<Rigidbody2D>(out var body))
            {
                body.gravityScale = 0f;
                body.freezeRotation = true;
                body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
                EditorUtility.SetDirty(body);
            }
        }

        private static void EnsureWallPhysics(GameObject wall)
        {
            if (!wall.TryGetComponent<BoxCollider2D>(out var collider))
            {
                collider = wall.AddComponent<BoxCollider2D>();
            }

            collider.size = new Vector2(0.95f, 0.95f);
            EditorUtility.SetDirty(collider);
        }

        private static void EnsureCoinPhysics(GameObject coin)
        {
            if (!coin.TryGetComponent<CircleCollider2D>(out var collider))
            {
                collider = coin.AddComponent<CircleCollider2D>();
            }

            collider.isTrigger = true;
            collider.radius = 0.22f;
            EditorUtility.SetDirty(collider);
        }

        private static void EnsureActorSprite(GameObject actor, string spriteName, Color color)
        {
            if (!actor.TryGetComponent<SpriteRenderer>(out var renderer))
            {
                renderer = actor.AddComponent<SpriteRenderer>();
            }

            renderer.sprite = LoadOrCreateSprite($"{GeneratedSpritesPath}/{spriteName}.png", color);
            renderer.sortingOrder = 10;
            EditorUtility.SetDirty(renderer);
        }

        private static Sprite LoadOrCreateSprite(string assetPath, Color color)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Sprite>(assetPath);
            if (existing != null)
            {
                return existing;
            }

            if (!File.Exists(assetPath))
            {
                var texture = new Texture2D(32, 32, TextureFormat.RGBA32, false);
                for (var y = 0; y < texture.height; y++)
                {
                    for (var x = 0; x < texture.width; x++)
                    {
                        texture.SetPixel(x, y, color);
                    }
                }

                texture.Apply();
                File.WriteAllBytes(assetPath, texture.EncodeToPNG());
                Object.DestroyImmediate(texture);
                AssetDatabase.ImportAsset(assetPath, ImportAssetOptions.ForceUpdate);
            }

            var importer = (TextureImporter)AssetImporter.GetAtPath(assetPath);
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = 32f;
            importer.filterMode = FilterMode.Point;
            importer.SaveAndReimport();

            var sprites = AssetDatabase.LoadAllAssetsAtPath(assetPath).OfType<Sprite>().ToArray();
            if (sprites.Length == 0)
            {
                throw new System.InvalidOperationException($"Unity imported {assetPath}, but no Sprite asset was created.");
            }

            return sprites[0];
        }

        private static T LoadOrCreateAsset<T>(string path) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null)
            {
                return asset;
            }

            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }

        private static void SetObjectReference(Object target, string fieldName, Object value)
        {
            var serialized = new SerializedObject(target);
            var property = serialized.FindProperty(fieldName);
            if (property == null)
            {
                Debug.LogWarning($"Could not set {fieldName} on {target.name}.");
                return;
            }

            property.objectReferenceValue = value;
            serialized.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(target);
        }
    }
}
