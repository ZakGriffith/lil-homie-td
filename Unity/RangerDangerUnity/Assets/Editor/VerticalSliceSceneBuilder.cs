using System.IO;
using RangerDanger.Data;
using RangerDanger.Entities;
using RangerDanger.Grid;
using RangerDanger.Waves;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace RangerDanger.Editor
{
    public static class VerticalSliceSceneBuilder
    {
        private const string GeneratedPath = "Assets/Generated";
        private const string ScenesPath = "Assets/Scenes";

        [MenuItem("Ranger Danger/Build Meadow Vertical Slice")]
        public static void Build()
        {
            Directory.CreateDirectory(GeneratedPath);
            Directory.CreateDirectory(ScenesPath);

            var balance = LoadOrCreateAsset<GameBalance>($"{GeneratedPath}/GameBalance.asset");
            var levels = LoadOrCreateAsset<LevelCatalog>($"{GeneratedPath}/LevelCatalog.asset");
            var enemyPrefab = CreateEnemyPrefab(balance);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 8f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.12f, 0.2f, 0.11f);

            var gridObject = new GameObject("Grid Occupancy");
            var grid = gridObject.AddComponent<GridOccupancy>();

            var sessionObject = new GameObject("Game Session");
            SetPrivateField(sessionObject.AddComponent<RangerDanger.Core.GameSession>(), "balance", balance);
            SetPrivateField(sessionObject.GetComponent<RangerDanger.Core.GameSession>(), "levels", levels);
            SetPrivateField(sessionObject.GetComponent<RangerDanger.Core.GameSession>(), "grid", grid);

            var player = CreateActor("Player", new Color(0.25f, 0.55f, 0.95f), Vector2.zero, new Vector2(0.55f, 0.75f));
            player.AddComponent<PlayerController>();
            player.AddComponent<Damageable>().Configure(balance.player.hp);
            SetPrivateField(player.GetComponent<PlayerController>(), "balance", balance);

            var waveObject = new GameObject("Wave Director");
            var wave = waveObject.AddComponent<WaveDirector>();
            SetPrivateField(wave, "balance", balance);
            SetPrivateField(wave, "enemyPrefab", enemyPrefab);
            SetPrivateField(wave, "grid", grid);
            SetPrivateField(wave, "player", player.transform);

            EditorSceneManager.SaveScene(scene, $"{ScenesPath}/MeadowVerticalSlice.unity");
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Selection.activeObject = player;
        }

        private static EnemyController CreateEnemyPrefab(GameBalance balance)
        {
            var prefabPath = $"{GeneratedPath}/EnemyPrototype.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<EnemyController>(prefabPath);
            if (existing != null)
            {
                return existing;
            }

            var enemy = CreateActor("EnemyPrototype", new Color(0.75f, 0.22f, 0.16f), Vector2.zero, new Vector2(0.55f, 0.55f));
            enemy.AddComponent<Damageable>();
            var controller = enemy.AddComponent<EnemyController>();
            var prefab = PrefabUtility.SaveAsPrefabAsset(enemy, prefabPath).GetComponent<EnemyController>();
            Object.DestroyImmediate(enemy);
            return prefab;
        }

        private static GameObject CreateActor(string name, Color color, Vector2 position, Vector2 size)
        {
            var actor = new GameObject(name);
            actor.transform.position = position;

            var renderer = actor.AddComponent<SpriteRenderer>();
            renderer.sprite = CreateSprite(color, size);
            renderer.sortingOrder = 10;

            var body = actor.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.freezeRotation = true;

            var collider = actor.AddComponent<CircleCollider2D>();
            collider.radius = Mathf.Max(size.x, size.y) * 0.45f;

            return actor;
        }

        private static Sprite CreateSprite(Color color, Vector2 size)
        {
            var texture = new Texture2D(16, 16, TextureFormat.RGBA32, false);
            for (var y = 0; y < texture.height; y++)
            {
                for (var x = 0; x < texture.width; x++)
                {
                    texture.SetPixel(x, y, color);
                }
            }

            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f), 16f / Mathf.Max(size.x, size.y));
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

        private static void SetPrivateField(Object target, string fieldName, Object value)
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
        }
    }
}
