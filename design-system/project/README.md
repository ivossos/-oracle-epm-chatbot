# Authorization Motion

A motion-first design system for the **Authorization** screen of a WorkOS dashboard environment: roles, permissions and how they are assigned. It sets the palette, type and spacing, and above all **how things move**: every expand, toggle, dialog and toast on this screen uses the same timing and curves.

> Built without access to the live dashboard (it sits behind a sign-in). Colors and type follow the public look of the WorkOS dashboard: neutral grays, a single indigo accent, Inter. Swap exact values once you have them.

## Content fundamentals

- **Plain, exact nouns.** "Role", "Permission", "Slug". Never "access thingy" or "privilege set".
- **Sentence case** for titles and buttons: "Create role", "Add permission".
- **Slugs are code.** Show them in `slug` style (mono, `ink-muted`): `posts:read`, `billing:manage`.
- **Confirm by naming the object.** Toast: "Role *Editor* created", not "Success!".
- **Destructive copy says what is lost.** "Delete role *Editor*? 12 members lose these permissions."

## Visual foundations

- **Neutral first.** Surfaces `surface-0` → `surface-200`, hairlines `border`. Color appears only for action (`accent`) and outcome (`success`, `danger`).
- **One accent.** `accent` fills the primary button and the switch-on state; `accent-text` for links; `accent-soft` for selection and the brief highlight after something changes.
- **Hairlines, not shadows**, inside the page. Shadows (`shadow-popover`, `shadow-dialog`) only on things that float: toasts, menus, dialogs.
- **Type:** Inter for UI, JetBrains Mono for slugs. `page-title` once per page; tables run on `body` and `body-strong`.
- **Spacing:** 4px base. Rows `space-3` vertical × `space-4` horizontal; dialogs `space-6`.
- **Radius:** `radius-sm` chips, `radius-md` controls, `radius-lg` cards and dialogs, `radius-full` switches.

## Motion, in one paragraph

Motion here explains change; it never decorates. **Small and frequent is fast** (`duration-instant`, `duration-fast`); **large or far is slower** (`duration-base`, `duration-slow`). Things **arrive** on `ease-enter` and **leave** on `ease-exit`, about 30% faster than they came. Things that **change in place** use `ease-standard`. Movement is short: at most `space-2` (8px) of travel, scale never below 0.96. Siblings stagger by `stagger-step`, total ≤150ms. Under `prefers-reduced-motion: reduce`, every movement becomes a plain fade of `duration-fast` and loops stop. The full choreography is in **Motion**.

## Iconography

Line icons at 16px, 1.5px stroke, in `ink-muted`; `ink` on hover. Icons animate only by rotation (chevrons, 90° on `duration-fast`) or by swapping (spinner → check). No logo is included: this system does not reproduce WorkOS marks.

## Components

| Component | What moves |
| --- | --- |
| RoleRow | Expand / collapse its permission list |
| PermissionSwitch | Thumb slide, track fill, saving → saved |
| CreateRoleDialog | Scrim fade, dialog rise-and-scale in, quicker out |
| PermissionChips | Chips added with a highlight flash, removed by collapsing |
| Toast | Slides up from the corner, auto-dismiss progress |
| TableSkeleton | Shimmer while loading, then crossfade to rows |
