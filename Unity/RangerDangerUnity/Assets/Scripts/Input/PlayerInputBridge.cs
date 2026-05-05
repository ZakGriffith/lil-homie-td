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

        public void OnAim(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetAim(context);
        }

        public void OnFire(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetFire(context);
        }

        public void OnBuild(InputAction.CallbackContext context)
        {
            PlayerInputReader.SetBuild(context);
        }
    }
}
