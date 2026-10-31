# RoleRow
A role in the roles table that expands to reveal its permissions.

- **Expand:** body height `0fr → 1fr` (CSS grid rows) with opacity, `duration-base` on `ease-standard`. Chevron rotates 90° on `duration-fast`.
- **Collapse:** the same transition reversed; no separate exit curve because the row stays in place.
- Hover background change on `duration-instant`.
- One row can be open at a time or many; motion is the same. Set `aria-expanded` on the header button.
- Consumer provides: role name, slug, permission list.
