using RangerDanger.Entities;
using UnityEngine;

namespace RangerDanger.Combat
{
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class Projectile : MonoBehaviour
    {
        [SerializeField] private float lifetimeSeconds = 2f;

        private Rigidbody2D body;
        private int damage;
        private float despawnAt;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
        }

        public void Launch(Vector2 position, Vector2 direction, float speed, int amount)
        {
            transform.position = position;
            transform.right = direction;
            damage = amount;
            despawnAt = Time.time + lifetimeSeconds;
            body.velocity = direction.normalized * speed;
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

            damageable.Hurt(damage);
            gameObject.SetActive(false);
        }
    }
}
