# PermissionChips
The list of permissions assigned to a role, as removable chips.

- **Add:** chip scales .96→1 with opacity on `duration-fast`, `ease-enter`, and flashes `accent-soft` with an `accent` border for 600ms so the eye finds it.
- **Add several:** stagger by `stagger-step` (30ms); after five, the rest arrive together.
- **Remove:** opacity and width collapse to 0 on `duration-fast`, `ease-exit`; neighbours slide into the gap as part of the same motion.
- Remove button needs an `aria-label` naming the permission.
