// CSS for the NitPik Shadow DOM. Accent colour comes from --nitpik-color.
export const STYLES = `
:host { all: initial; --nitpik-color: #F59E0B; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; color: #1f2937; }
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; cursor: pointer; }

[data-nitpik-trigger] {
  position: absolute; width: 24px; height: 24px; padding: 0; margin: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--nitpik-color); color: #fff; border: 0; border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,.25); opacity: 0; transition: opacity .15s ease;
  z-index: 2147483000;
}
[data-nitpik-trigger].visible, [data-nitpik-trigger]:focus-visible, [data-nitpik-trigger]:hover { opacity: 1; }
[data-nitpik-trigger] svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
:focus-visible { outline: 2px solid #1f2937; outline-offset: 2px; }

[data-nitpik-popover] {
  position: fixed; width: 360px; max-width: 360px; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.22); padding: 12px; z-index: 2147483600;
  border-top: 3px solid var(--nitpik-color);
}
[data-nitpik-popover] form { display: flex; flex-direction: column; gap: 8px; margin: 0; }
[data-nitpik-path] { font-size: 12px; color: #6b7280; word-break: break-word; }
[data-nitpik-popover] textarea {
  width: 100%; min-height: 80px; resize: vertical; font: inherit; padding: 8px;
  border: 1px solid #d1d5db; border-radius: 6px; color: inherit; background: #fff;
}
.nitpik-actions { display: flex; justify-content: flex-end; gap: 8px; }
.nitpik-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #1f2937; }
.nitpik-btn.primary { background: var(--nitpik-color); border-color: var(--nitpik-color); color: #1f2937; font-weight: 600; }

[data-nitpik-counter] {
  position: fixed; bottom: 16px; right: 16px; padding: 8px 14px; border: 0; border-radius: 999px;
  background: var(--nitpik-color); color: #1f2937; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,.25);
  z-index: 2147483500;
}
[data-nitpik-panel] {
  position: fixed; bottom: 60px; right: 16px; width: 320px; max-width: calc(100vw - 32px); max-height: 60vh;
  display: flex; flex-direction: column; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.22); z-index: 2147483500; overflow: hidden;
}
[data-nitpik-panel] ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
[data-nitpik-panel] li { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
[data-nitpik-panel] li b { display: block; font-size: 12px; color: #6b7280; font-weight: 500; }
.nitpik-panel-actions { display: flex; gap: 6px; padding: 8px 12px; border-top: 1px solid #e5e7eb; }

[data-nitpik-toast] {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%); padding: 8px 16px;
  background: #1f2937; color: #fff; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
  animation: nitpik-slide .25s ease-out; z-index: 2147483647;
}
@keyframes nitpik-slide { from { transform: translate(-50%, -150%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

@media (max-width: 480px) {
  [data-nitpik-popover] { width: 100%; max-width: 100%; left: 0 !important; border-radius: 10px 10px 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  [data-nitpik-toast] { animation: none; }
  [data-nitpik-trigger] { transition: none; }
}
`
