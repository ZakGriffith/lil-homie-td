using RangerDanger.Entities;
using UnityEngine;

namespace RangerDanger.Combat
{
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class Projectile : MonoBehaviour
    {
        [SerializeField] private float lifetimeSeconds = 2f;

        private Rigidbody2D body;
        private Damageable owner;
        private int damage;
        private float despawnAt;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
        }

        public void Launch(Vector2 position, Vector2 direction, float speed, int amount, Damageable ignoredOwner = null)
        {
            transform.position = position;
            transform.right = direction;
            owner = ignoredOwner;
            damage = amount;
            despawnAt = Time.time + lifetimeSeconds;
            body.linearVelocity = direction.normalized * speed;
            gameObject.SetActive(true);
        }

        private void Update()
        {
            if (Time.time >= despawnAt)
            {
                gameObject.SetActive(false);
            }
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!other.TryGetComponent<Damageable>(out var damageable))
            {
                return;
            }

            if (damageable == owner)
            {
                return;
            }

            damageable.Hurt(damage);
            gameObject.SetActive(false);
        }
    }
}
