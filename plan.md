# Nexus — iOS 18+ Apple UI Enhancement Plan

> **Goal:** Elevate Nexus from “iOS-inspired” to a faithful, modern Apple interface aligned with **iOS 18 / iOS 26 (Liquid Glass)** Human Interface Guidelines — while staying web-native (Vue 3 + Tailwind).

---

## 1. Current State Audit

| Area | Today | Gap vs. latest iOS |
|------|--------|---------------------|
| **Materials** | Flat white cards + basic `backdrop-filter` blur | Missing layered **Liquid Glass** (translucency, vibrancy, depth, specular highlights) |
| **Typography** | Inter fallback, static type scale | Not using **SF Pro** stack; no Dynamic Type–style scaling |
| **Navigation** | Sticky blur header, fixed tab bar | No **collapsing large title**, no floating/glass tab bar, no edge-swipe back |
| **Lists** | Inset grouped lists | No swipe actions, no context menus, no reorder drag handles |
| **Sheets** | Basic bottom sheet | No detents (medium/large), no interactive dismiss, no nested presentation |
| **Motion** | CSS transitions only | Missing spring physics, reduced-motion respect, coordinated page transitions |
| **Color** | Static hex tokens | No semantic **vibrant** labels, no elevated/grouped hierarchy, no tint/accent theming |
| **Icons** | Phosphor (non-Apple) | Visual mismatch with SF Symbols weight/style |
| **Widgets** | Simple 2-col grid | Not using iOS **widget composition** (corners, content margins, glanceable hierarchy) |
| **Haptics** | Single `navigator.vibrate` on task toggle | No structured haptic patterns per action type |

**Files to evolve first:** `src/assets/main.css`, `src/components/layout/NavBar.vue`, `TabBar.vue`, `src/components/ui/*`, all `src/views/*`.

---

## 2. Design North Star — Latest Apple UI Principles

Reference: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### 2.1 Liquid Glass (iOS 26 direction)

Apple’s newest material system emphasizes **translucent layers that reflect context**:

- Navigation bars, tab bars, and sheets float above content with glass-like blur + saturation
- Content scrolls **under** chrome (parallax / collapse)
- Subtle border highlights (top edge light, bottom edge shadow)
- Rounded continuity — corners feel carved from the same surface

**Web implementation strategy:**

```css
/* Target material stack */
.glass-bar {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 0.5px 0 rgba(0, 0, 0, 0.06);
}
.dark .glass-bar {
  background: rgba(30, 30, 30, 0.72);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
```

### 2.2 iOS 18+ Semantic Color System

Upgrade tokens in `main.css` to match Apple’s semantic naming:

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `systemGroupedBackground` | `#F2F2F7` | `#000000` | Screen background |
| `secondarySystemGroupedBackground` | `#FFFFFF` | `#1C1C1E` | Cards, inset groups |
| `tertiarySystemGroupedBackground` | `#F2F2F7` | `#2C2C2E` | Nested groups |
| `label` | `#000000` | `#FFFFFF` | Primary text |
| `secondaryLabel` | `rgba(60,60,67,0.6)` | `rgba(235,235,245,0.6)` | Subtitles |
| `tertiaryLabel` | `rgba(60,60,67,0.3)` | `rgba(235,235,245,0.3)` | Hints |
| `separator` | `rgba(60,60,67,0.29)` | `rgba(84,84,88,0.65)` | Dividers |
| `systemBlue` | `#007AFF` | `#0A84FF` | Actions, links |
| `systemGreen` | `#34C759` | `#30D158` | Success, done |
| `systemOrange` | `#FF9500` | `#FF9F0A` | Warnings |
| `systemRed` | `#FF3B30` | `#FF453A` | Destructive |

### 2.3 Typography — SF Pro Scale

Load SF Pro via licensed files or use system stack:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif;
```

| Style | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| Large Title | 34pt | Bold | -0.4px | Screen headers |
| Title 1 | 28pt | Bold | +0.36px | Section heroes |
| Title 2 | 22pt | Bold | +0.35px | Card titles |
| Title 3 | 20pt | Semibold | +0.38px | Subsections |
| Headline | 17pt | Semibold | -0.43px | List primary |
| Body | 17pt | Regular | -0.43px | Paragraphs |
| Callout | 16pt | Regular | -0.32px | Secondary body |
| Subheadline | 15pt | Regular | -0.24px | Metadata |
| Footnote | 13pt | Regular | -0.08px | Captions |
| Caption 1 | 12pt | Regular | 0 | Badges |
| Caption 2 | 11pt | Regular | +0.07px | Tab labels |

Add `clamp()`-based scaling for accessibility (Dynamic Type lite).

---

## 3. Component Enhancement Roadmap

### Phase 1 — Design System Foundation ✅

**Deliverables**

- [x] `src/design/tokens.css` — semantic color, spacing, radius, shadow, motion tokens
- [x] `src/design/typography.css` — full SF scale utilities
- [x] `src/design/materials.css` — glass, elevated, grouped surfaces
- [x] `src/design/motion.css` — transitions, springs, reduced-motion
- [x] `src/design/constants.ts` — TS mirror for layout/motion constants
- [x] Refactor `main.css` to import token layers
- [x] Add `prefers-reduced-motion` overrides globally

**Spacing & radius (iOS standard)**

| Token | Value |
|-------|-------|
| Screen horizontal inset | 16px (20px on Plus/Max) |
| Grouped list inset | 16px |
| Card corner radius | 12px (continuous / `border-radius: 12px` → explore `corner-shape: superellipse` when supported) |
| Sheet top radius | 12px (iOS 18) → 16px for modals |
| Button height | 50px (primary), 44px (min touch) |
| List row min height | 44px |

---

### Phase 2 — Navigation Chrome (Week 1–2)

#### 2A. Collapsing Large Title NavBar

**File:** `NavBar.vue`

Behavior:

1. Large title visible at scroll top
2. On scroll down, title collapses into inline center/small title in compact bar
3. Bar background opacity increases with scroll offset
4. Use `@vueuse/core` `useScroll` on page container

```
Scroll 0px     → Large Title (34pt) + transparent glass
Scroll 1–60px  → Crossfade to compact title
Scroll 60px+   → Compact nav (44pt bar) + opaque glass
```

#### 2B. Floating Glass Tab Bar

**File:** `TabBar.vue`

iOS 18+ tab bar traits:

- Detached pill shape with margin from screen edges (16px inset)
- Glass material with subtle shadow
- Active tab: filled icon + label; inactive: outline/muted
- Optional: hide tab bar on scroll down, reveal on scroll up

```
┌─────────────────────────────────────┐
│                                     │
│            (content)                │
│                                     │
│   ╭─────────────────────────────╮   │
│   │  🏠   ✓   📁   🔖   📊      │   │  ← floating glass pill
│   ╰─────────────────────────────╯   │
└─────────────────────────────────────┘
```

#### 2C. Page Transitions

**File:** `router/index.ts`, `App.vue`

- Push: slide from right (existing `slide` transition — tune easing to `cubic-bezier(0.2, 0.9, 0.3, 1.0)`)
- Pop/back: slide to right
- Tab switch: crossfade (no slide)
- Modal/sheet: vertical spring

---

### Phase 3 — Core UI Primitives (Week 2)

| Component | Enhancement |
|-----------|-------------|
| **IOSButton** | Add `.bordered`, `.borderedProminent`, `.plain`, `.destructive` variants matching iOS 18 button styles; min 44pt touch target |
| **IOSCard** | Glass variant; widget-style with 16pt internal padding grid; optional accent gradient header |
| **IOSListGroup** | Section headers (uppercase footnote style + 16px top margin); footer captions |
| **IOSListItem** | 56pt rows for rich content; separator inset from leading edge (align with text, not icon) |
| **IOSSheet** | Detents: `.medium` (50%), `.large` (90%); drag-to-dismiss; rubber-band on over-scroll |
| **IOSTextField** | Inset grouped field style; clear button; floating label optional |
| **NEW: IOSSwitch** | iOS toggle with spring thumb animation |
| **NEW: IOSChip** | Filter chips (Interview difficulty, resource tags) — capsule, selected fill |
| **NEW: IOSContextMenu** | Long-press menu with blur backdrop |
| **NEW: IOSSwipeRow** | Swipe leading (complete) / trailing (delete, favorite) actions |
| **NEW: IOSSearchBar** | Collapsible search in nav bar (Resources, Tasks) |
| **NEW: IOSEmptyState** | SF-style illustration + title + subtitle + CTA |

---

### Phase 4 — Screen-by-Screen Polish (Week 3)

#### Dashboard (`DashboardView.vue`)

- [ ] **Widget grid** — adopt iOS Home Screen widget layout rules:
  - Small (1×1): single metric + icon
  - Medium (2×1): metric + sparkline or subtext
  - Consistent 16pt inner padding, 12pt corner radius
- [ ] **Glanceable hierarchy** — number first, label second (already started; refine typography)
- [ ] **Live updates** — subtle pulse on realtime task change
- [ ] **Pull-to-refresh** — rubber-band + spinner at top

#### Tasks (`TasksView.vue`)

- [ ] Swipe right → complete (green); swipe left → delete (red)
- [ ] Drag handle reorder (match `sort_order` in Supabase)
- [ ] Priority pills use `IOSChip`
- [ ] Section headers: “Today”, “Scheduled”, “Completed” (iOS Reminders pattern)
- [ ] Checkbox animation: scale + bounce on complete

#### Projects (`ProjectsView.vue`)

- [ ] Card thumbnails with gradient fallback (project color hash)
- [ ] Status badge as capsule on trailing edge
- [ ] Grid/List toggle (iOS Files app pattern)

#### Resources (`ResourcesView.vue`)

- [ ] Search bar in nav (collapsible large title → search)
- [ ] Tag chips horizontal scroll with momentum
- [ ] Favicon preview in list rows

#### Analytics (`AnalyticsView.vue`)

- [ ] Chart colors match `systemBlue`, `systemGreen`, `systemOrange`
- [ ] Activity heatmap (GitHub-style) for study sessions
- [ ] Ring progress for daily goal (Apple Fitness style)

#### Settings (`SettingsView.vue`)

- [ ] Pure inset grouped list (no loose fields) — match iOS Settings app
- [ ] Profile header block with avatar circle + name (like Apple ID row)
- [ ] Version footer centered footnote

#### Auth (`AuthView.vue`)

- [ ] Full-bleed gradient mesh background (iOS 18 wallpaper feel)
- [ ] Centered glass card for form
- [ ] Sign in with Apple button style parity (alongside GitHub)

---

### Phase 5 — Motion, Haptics & Micro-interactions (Week 3–4)

#### Spring animation constants

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button press | 0.15s | `scale(0.97)` |
| Sheet present | 0.45s | `cubic-bezier(0.32, 0.72, 0, 1)` |
| List item swipe | 0.25s | spring |
| Tab switch | 0.2s | ease-out |
| Checkbox complete | 0.35s | bounce |

#### Haptic map (`src/composables/useHaptics.ts`)

| Action | Pattern |
|--------|---------|
| Task complete | light impact |
| Task delete | warning |
| Pull refresh release | medium impact |
| Error | error pattern |
| Tab change | selection (if supported) |

Respect `prefers-reduced-motion` — disable springs, use opacity only.

---

### Phase 6 — Icons & Visual Assets (Week 4)

**Option A (recommended):** [SF Symbols via `@tabler/icons` alternative — or SVG subset]

Use a curated set of SF Symbol–matching SVGs (24×24, 20×20, weight: regular/medium/semibold).

**Option B:** Keep Phosphor but enforce:
- 24pt tab icons, 20pt inline
- `regular` inactive / `fill` active only
- Match stroke weight to SF (≈1.5px at 24pt)

**App icon & splash**

- [ ] 1024×1024 app icon with iOS 18 layered icon style (foreground + background depth)
- [ ] `apple-touch-icon` + `theme-color` meta per light/dark
- [ ] PWA splash screens for standalone mode

---

## 4. Technical Architecture

```
src/
├── design/
│   ├── tokens.css          # Colors, spacing, radii, shadows
│   ├── typography.css      # SF scale utilities
│   ├── materials.css       # Glass, elevation
│   └── motion.css          # Transitions, springs
├── composables/
│   ├── useCollapsingNav.ts # Large title scroll behavior
│   ├── useHaptics.ts       # Vibration API wrapper
│   ├── useSwipeActions.ts  # List swipe gesture
│   └── useSheetDetent.ts   # Sheet snap points
├── components/
│   ├── layout/
│   │   ├── NavBar.vue      # ↑ collapsing large title
│   │   └── TabBar.vue      # ↑ floating glass pill
│   └── ui/
│       ├── ...existing
│       ├── IOSSwipeRow.vue
│       ├── IOSContextMenu.vue
│       ├── IOSChip.vue
│       ├── IOSSwitch.vue
│       └── IOSSearchBar.vue
```

**Dependencies to consider**

| Package | Purpose |
|---------|---------|
| `@vueuse/motion` or `@vueuse/gesture` | Spring + swipe gestures |
| `@fontsource/inter` | Remove once SF stack validated |
| None required | Prefer CSS + VueUse core to stay lightweight |

---

## 5. Implementation Phases Summary

| Phase | Focus | Effort | Impact |
|-------|-------|--------|--------|
| **1** | Tokens, typography, materials | 2–3 days | High — everything inherits |
| **2** | NavBar collapse + floating tab bar | 2–3 days | High — instant “native” feel |
| **3** | UI primitives (swipe, chips, sheets) | 3–4 days | High — interaction fidelity |
| **4** | Per-screen polish | 4–5 days | Medium — feature completeness |
| **5** | Motion + haptics | 2 days | Medium — delight |
| **6** | Icons + PWA assets | 1–2 days | Low–medium — polish |

**Total estimate:** ~3–4 weeks part-time

---

## 6. Quality Checklist (Definition of Done)

### Visual

- [ ] Light and dark mode pass side-by-side with iOS Settings / Reminders screenshots
- [ ] All touch targets ≥ 44×44pt
- [ ] Separators inset correctly on list rows with icons
- [ ] No harsh drop shadows in dark mode (use borders + elevation)

### Interaction

- [ ] Back gesture / button animates correctly
- [ ] Sheets dismiss via drag and scrim tap
- [ ] Swipe actions don’t conflict with browser back gesture (use `touch-action`)
- [ ] `prefers-reduced-motion` honored

### Performance

- [ ] `backdrop-filter` used only on fixed chrome (not every card)
- [ ] Lighthouse mobile performance ≥ 90
- [ ] No layout shift on font load (system font stack helps)

### Accessibility

- [ ] WCAG AA contrast on all text/background pairs
- [ ] Focus rings for keyboard navigation
- [ ] `aria-label` on icon-only buttons
- [ ] Screen reader order matches visual order

---

## 7. Priority Order (If Time-Boxed)

**Must-have (MVP polish):**

1. Semantic color tokens + dark mode fixes
2. Collapsing large title NavBar
3. Floating glass TabBar
4. Swipe-to-complete/delete on Tasks
5. Sheet detents + drag dismiss

**Should-have:**

6. IOSChip for filters
7. Pull-to-refresh on Dashboard
8. Settings screen inset-grouped refactor
9. Widget-style dashboard cards

**Nice-to-have:**

10. Context menus (long-press)
11. Activity heatmap
12. Sign in with Apple styling
13. `corner-shape: superellipse` when browser support lands

---

## 8. References

- [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [iOS 18 Design Updates (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10118/)
- [Liquid Glass — iOS 26 Design](https://developer.apple.com/design/whats-new/)

---

## 9. Next Step

Start **Phase 1**: extract tokens from `main.css` into `src/design/`, then upgrade `NavBar.vue` and `TabBar.vue` — these two changes deliver the biggest perceived quality jump with the least code churn.
