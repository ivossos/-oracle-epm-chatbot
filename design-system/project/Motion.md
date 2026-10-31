# Motion

Timing and curves live in tokens (`duration-*`, `easing`) and compile to CSS custom properties: always write `transition: height var(--duration-base) var(--ease-standard)`, never raw numbers.

## The rules

1. **Explain, don't decorate.** Animate only what changed, because it changed.
2. **Size sets speed.** Control (switch, chevron, chip): `duration-fast`. Region (row body, dialog): `duration-base`. Arrival from off-screen (toast): `duration-slow`.
3. **Enter soft, exit quick.** Enter on `ease-enter`; exit on `ease-exit` at ~70% of the enter time.
4. **Short travel.** ≤ 8px (`space-2`) translate; scale 0.96 → 1. No bounces, no overshoot.
5. **Stagger lightly.** `stagger-step` (30ms) per sibling, max 5 siblings staggered (150ms); the rest arrive with the fifth.
6. **Never block input.** A user can click through an animation; a new action interrupts the old one from its current state.
7. **Reduced motion.** Replace transforms and height changes with a `duration-fast` opacity fade; stop shimmer; keep the spinner (it carries state).

## Choreography on the Authorization screen

| Moment | Element | Property | Duration | Curve |
| --- | --- | --- | --- | --- |
| Page load | Roles table | skeleton shimmer, loop | `duration-shimmer` | `ease-linear` |
| Data arrives | Rows | opacity 0→1, y 4px→0, staggered | `duration-slow` | `ease-enter` |
| Expand role | Row body | height auto, opacity | `duration-base` | `ease-standard` |
| Expand role | Chevron | rotate 0→90° | `duration-fast` | `ease-standard` |
| Toggle permission | Thumb | translateX | `duration-fast` | `ease-standard` |
| Toggle permission | Track | background-color | `duration-instant` | `ease-standard` |
| Saving | Inline status | spinner → check, check fades after 1.2s | `duration-fast` | `ease-enter` |
| Open "Create role" | Scrim | opacity | `duration-base` | `ease-enter` |
| Open "Create role" | Dialog | opacity, y 8px→0, scale .96→1 | `duration-base` | `ease-enter` |
| Close dialog | Dialog + scrim | reverse | `duration-fast` | `ease-exit` |
| Assign permission | New chip | scale .96→1, opacity, `accent-soft` flash 600ms | `duration-fast` | `ease-enter` |
| Remove permission | Chip | opacity, width → 0 | `duration-fast` | `ease-exit` |
| Confirm | Toast | y 16px→0, opacity | `duration-slow` | `ease-enter` |
| Dismiss | Toast | opacity, y 0→8px | `duration-base` | `ease-exit` |

## CSS starter

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-iteration-count: 1 !important;
    transition-property: opacity !important;
    transition-duration: var(--duration-fast) !important;
  }
}
```
