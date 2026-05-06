using RangerDanger.Entities;
using UnityEngine;

namespace RangerDanger.Economy
{
    [RequireComponent(typeof(Collider2D))]
    public sealed class CoinPickup : MonoBehaviour
    {
        [SerializeField] private int value = 1;
        [SerializeField] private float lifetimeSeconds = 12f;
        [SerializeField] private float attractRadius = 2.25f;
        [SerializeField] private float collectRadius = 0.3f;
        [SerializeField] private float pullSpeed = 8f;

        private float despawnAt;
        private PlayerController target;

        public void Configure(int amount)
        {
            value = amount;
            despawnAt = Time.time + lifetimeSeconds;
        }

        private void Awake()
        {
            GetComponent<Collider2D>().isTrigger = true;
            despawnAt = Time.time + lifetimeSeconds;
        }

        private void Update()
        {
            if (Time.time >= despawnAt)
            {
                Destroy(gameObject);
                return;
            }

            UpdateTarget();
            if (target == null)
            {
                return;
            }

            var targetPosition = target.transform.position;
            transform.position = Vector2.MoveTowards(transform.position, targetPosition, pullSpeed * Time.deltaTime);
            if (((Vector2)targetPosition - (Vector2)transform.position).sqrMagnitude <= collectRadius * collectRadius)
            {
                Collect(target);
            }
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.TryGetComponent<PlayerController>(out var player))
            {
                return;
            }

            Collect(player);
        }

        private void UpdateTarget()
        {
            if (target != null)
            {
                return;
            }

            var player = Object.FindFirstObjectByType<PlayerController>();
            if (player == null)
            {
                return;
            }

            if (((Vector2)player.transform.position - (Vector2)transform.position).sqrMagnitude <= attractRadius * attractRadius)
            {
                target = player;
            }
        }

        private void Collect(PlayerController player)
        {
            if (player == null)
            {
                return;
            }

            player.AddMoney(value);
            Destroy(gameObject);
        }
    }
}
