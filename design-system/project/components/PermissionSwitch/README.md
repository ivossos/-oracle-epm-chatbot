# PermissionSwitch
A switch that grants or revokes one permission on a role, saving immediately.

- **Thumb:** translateX 16px on `duration-fast`, `ease-standard`.
- **Track:** color swaps `surface-200` → `accent` on `duration-instant` (color reads before movement).
- **Save feedback:** inline spinner + "Saving", then "✓ Saved" in `success` fading in on `duration-fast`; the check fades out after 1.2s.
- Flip the switch optimistically; on error, slide it back and show an error toast.
- Use `role="switch"` and `aria-checked`; status text sits in an `aria-live="polite"` region.
