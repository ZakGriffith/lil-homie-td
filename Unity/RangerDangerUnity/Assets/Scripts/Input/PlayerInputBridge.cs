using UnityEngine;
using UnityEngine.InputSystem;

namespace RangerDanger.Input
{
    public sealed class PlayerInputBridge : MonoBehaviour
    {
        public void OnMove(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetMove(context);
        }

        public void OnMove(InputValue value)
        {
            PlayerInputReader.SetMove(value.Get<Vector2>());
        }

        public void OnAim(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetAim(context);
        }

        public void OnAim(InputValue value)
        {
            PlayerInputReader.SetAim(value.Get<Vector2>());
        }

        public void OnFire(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetFire(context);
        }

        public void OnFire(InputValue value)
        {
            PlayerInputReader.SetFire(value.isPressed);
        }

        public void OnBuild(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetBuild(context);
        }

        public void OnBuild(InputValue value)
        {
            if (value.isPressed)
            {
                PlayerInputReader.PressBuild();
            }
        }
    }
}
