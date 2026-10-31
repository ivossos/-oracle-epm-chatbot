# CreateRoleDialog
The modal for creating a role: the largest motion on the screen.

- **Enter:** scrim opacity 0→1 and dialog opacity + `translateY(8px) scale(.96)` → none, both `duration-base` on `ease-enter`.
- **Exit:** same properties reversed on `duration-fast`, `ease-exit`: leaving is quicker than arriving.
- Move focus into the first field once the enter finishes (~200ms); return it to the trigger on close.
- Never animate the dialog's width or height; content inside does not stagger.
- Consumer provides: title, description, fields, actions.
