using UnityEngine;
using UnityEngine.InputSystem;

namespace RangerDanger.Input
{
    public static class PlayerInputReader
    {
        public static Vector2 Move { get; private set; }
        public static Vector2 Aim { get; private set; } = Vector2.right;
        public static bool FireHeld { get; private set; }
        public static bool BuildPressed { get; private set; }

        public static void SetMove(InputAction.CallbackContext context)
        {
            Move = context.ReadValue<Vector2>();
        }

        public static void SetAim(InputAction.CallbackContext context)
        {
            var value = context.ReadValue<Vector2>();
            if (value.sqrMagnitude > 0.001f)
            {
                Aim = value;
            }
        }

        public static void SetFire(InputAction.CallbackContext context)
        {
            FireHeld = context.ReadValueAsButton();
        }

        public static void SetBuild(InputAction.CallbackContext context)
        {
            if (context.performed)
            {
                BuildPressed = true;
            }
        }

        public static bool ConsumeBuildPressed()
        {
            if (!BuildPressed)
            {
                return false;
            }

            BuildPressed = false;
            return true;
        }
    }
}
