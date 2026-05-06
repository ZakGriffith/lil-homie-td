using UnityEngine;

namespace RangerDanger.Core
{
    public sealed class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private float followSharpness = 12f;

        public void Configure(Transform followTarget)
        {
            target = followTarget;
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            var current = transform.position;
            var desired = new Vector3(target.position.x, target.position.y, current.z);
            var t = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            transform.position = Vector3.Lerp(current, desired, t);
        }
    }
}
