# 🎨 UI Design System & Styling Guidelines

This document outlines the strict UI and UX design rules for **Vidmix v2**. AI Assistants and developers must adhere to these guidelines to maintain visual consistency.

## 1. Design Language: Neo-Brutalism
Vidmix v2 strictly follows the **Neo-Brutalism** design trend. This style is characterized by bold, unapologetic aesthetics that mimic retro UI with a modern, high-contrast twist.

### 🛑 Core Rules (DO NOT CHANGE)
1. **Thick Black Borders:** 
   - Almost all functional elements (buttons, panels, inputs, canvases) MUST have thick, solid black borders.
   - Example: `border-2 border-black` for small elements, `border-4 border-black` for large containers.
2. **Sharp, Solid Shadows:** 
   - Shadows must NOT be blurred. They must be solid block shadows.
   - Example Tailwind Class: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`.
   - Hover/Active states usually reduce the shadow to `0px` and translate the element (e.g., `active:translate-x-0.5 active:translate-y-0.5`) to simulate physical pressing.
3. **High-Contrast, Saturated Colors:**
   - Backgrounds and panels use extremely bright, solid colors. 
   - **Primary Palette:** 
     - Yellow: `#FFE500` (Main accents, warnings, primary buttons)
     - Cyan: `#00F0FF` (Secondary accents, highlights)
     - Magenta/Pink: `#FF90E8` (Special features, edit buttons)
     - Purple: `#7000FF` (Deep contrasts)
     - Neon Green: `#00FF55` (Success, active states)
4. **Typography:**
   - Fonts must be bold and legible.
   - Use `font-bold` or `font-black` on almost all textual elements.
   - Text color is predominantly black (`text-black`) on bright backgrounds, or bright colors on pure black backgrounds.

## 2. Component Implementation Guide

### Buttons
Buttons should look like physical blocks that depress when clicked.
```jsx
<button className="bg-[#00F0FF] border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
  ACTION BUTTON
</button>
```

### Panels / Containers
Containers group related features using vibrant background colors and thicker borders.
```jsx
<div className="border-4 border-black bg-[#FFE500] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
  <h2 className="text-lg font-black border-b-4 border-black pb-2 mb-4">PANEL TITLE</h2>
  {/* Content */}
</div>
```

### Floating & Absolute Elements (Canvas UI)
When dealing with the Video Canvas (`LayerCanvas.jsx`), active layers show a dashed or solid neon outline:
- **Hovered:** `hover:outline hover:outline-2 hover:outline-dashed hover:outline-yellow-400 hover:outline-offset-4`
- **Selected:** `outline outline-4 outline-solid outline-[#00FF55] outline-offset-4`

## 3. Tailwind Configuration
The project relies on a standard Tailwind CSS setup (`tailwind.config.js`). 
- Avoid adding excessive custom CSS files. Use Tailwind utility classes for all styling.
- Do NOT introduce soft UI concepts like `rounded-xl` or `shadow-lg` (which use blur). Everything must remain sharp and blocky (using `rounded-none`).

## 4. Toast Notifications
For alerts and notifications, the app uses standard toast alerts. Ensure that even these follow a relatively high-contrast design if customized, though the default `react-hot-toast` or similar library is acceptable for functional feedback.

---
**Summary for AI Agents:** If a user asks you to "make the UI look better" or "modernize the button", **DO NOT** apply soft shadows, gradients, or rounded corners. Stick strictly to the Neo-Brutalism classes defined above unless the user explicitly requests to abandon Neo-Brutalism.
