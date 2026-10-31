# TableSkeleton
The loading state of the roles table: shimmer, then a crossfade to real rows.

- **Loading:** blocks in `surface-200` with a `shimmer` band sweeping left on `duration-shimmer` (1.4s) `ease-linear`, looping. Match block widths to real content.
- **Loaded:** skeleton fades out while rows fade up 4px, `duration-slow`; rows stagger by `stagger-step`.
- Don't show a skeleton for loads under ~300ms; render rows directly.
- Reduced motion: no shimmer loop, a plain fade between states.
