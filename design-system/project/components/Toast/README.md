# Toast
A brief confirmation or error after a change on the Authorization screen.

- **Enter:** from bottom-right, translateY 16px → 0 with opacity, `duration-slow` on `ease-enter` (it travels farthest of any element here).
- **Exit:** opacity out and 8px down, `duration-base` on `ease-exit`.
- **Auto-dismiss:** 4s, shown as a 2px `accent` bar shrinking on `ease-linear`; hover pauses it.
- Name the object in the message; errors use `danger` for the icon only, never a red fill.
- Stack upward with `space-2` gaps; the container is `aria-live="polite"`.
