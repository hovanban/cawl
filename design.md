# Modern Dashboard Design System — PRO (Next.js + Tailwind)

## Context and Goals

Create a production-grade, dark-mode-first dashboard UI system optimized for data-dense interfaces, speed of implementation, and strict accessibility compliance. The system must be token-driven, consistent at scale, and ready for Next.js (App Router) + Tailwind.

---

## Design Tokens and Foundations

### Typography

* font.family.primary = Geist, Inter, system-ui, -apple-system, sans-serif
* font.size.xs = 12px
* font.size.sm = 13px
* font.size.md = 14px
* font.size.lg = 16px
* font.size.xl = 20px
* font.weight.base = 400
* font.weight.medium = 500
* font.weight.semibold = 600
* lineHeight.base = 1.5

### Color (Semantic — MUST use tokens)

* color.surface.base = #0B0F14

* color.surface.muted = #11161C

* color.surface.raised = #161B22

* color.surface.border = #232A34

* color.text.primary = #E6EDF3

* color.text.secondary = #9DA7B3

* color.text.muted = #6B7280

* color.brand.primary = #3B82F6

* color.brand.hover = #2563EB

* color.state.success = #10B981

* color.state.warning = #F59E0B

* color.state.error = #EF4444

### Spacing (8pt grid)

* space.1 = 4px
* space.2 = 8px
* space.3 = 12px
* space.4 = 16px
* space.5 = 24px
* space.6 = 32px

### Radius

* radius.sm = 8px
* radius.md = 12px
* radius.lg = 16px

### Shadow

* shadow.soft = 0 2px 8px rgba(0,0,0,0.25)

### Motion

* motion.duration.fast = 150ms
* motion.duration.normal = 250ms
* motion.easing.standard = ease-out

### Layout System

* grid.columns = 12
* container.maxWidth = 1280px
* breakpoint.sm = 640px
* breakpoint.md = 768px
* breakpoint.lg = 1024px
* breakpoint.xl = 1280px

---

## Component-Level Rules

### 1. Button

#### Variants

* Primary
* Secondary
* Danger

#### States (must)

* default, hover, focus-visible, active, disabled, loading

#### Behavior

* Click must trigger action
* Enter/Space must activate
* Loading state must disable pointer events and show spinner
* Focus-visible must show ring with sufficient contrast

#### Accessibility

* Must have aria-label when icon-only

---

### 2. Card

#### Behavior

* Must support hover elevation
* Must handle long content and overflow
* Must support loading skeleton state

---

### 3. Input / Form

#### States (must)

* default, focus, error, disabled

#### Behavior

* Must support keyboard navigation
* Must show inline error message
* Must support validation states

---

### 4. Table (Core Component)

#### Features (must)

* Sorting
* Pagination
* Row selection
* Empty state
* Loading skeleton

#### Behavior

* Must support horizontal scroll
* Must truncate long text with tooltip

---

### 5. Modal

#### Behavior

* Must trap focus
* Escape key must close
* Background must be inert

---

### 6. Dropdown / Select

#### Behavior

* Must support keyboard navigation (Arrow keys)
* Must close on outside click

---

### 7. Toast / Notification

#### Behavior

* Auto dismiss after timeout
* Must support success, warning, error variants

---

### 8. Sidebar Navigation

#### Behavior

* Active item must be visually distinct
* Must support keyboard navigation

---

### 9. Tabs

#### Behavior

* Arrow keys must switch tabs
* Active tab must be clearly indicated

---

### 10. Empty / Loading / Error States

#### Rules (must)

* Every data component must define all 3 states
* Loading must use skeleton UI, not spinner-only
* Empty state must provide clear next action
* Error state must provide retry action

---

## Accessibility Requirements (WCAG 2.2 AA)

* All interactive elements must be keyboard accessible
* Focus-visible must always be visible
* Contrast ratio must be >= 4.5:1

### Acceptance Criteria

* Tab navigation works across all components
* Buttons trigger via Enter/Space
* Modal traps focus correctly
* Screen readers can identify all controls

---

## Content and Tone Standards

* Must use clear, action-oriented labels
* Must avoid vague actions

### Examples

* Good: Create Project
* Good: Delete Account (destructive clarity)
* Bad: Submit

---

## Anti-Patterns (Prohibited)

* Do not use raw hex colors in components
* Do not hide focus outlines
* Do not create inconsistent spacing
* Do not ship components without full state definitions

---

## QA Checklist

* All components define required states
* Accessibility criteria pass
* No hardcoded values outside tokens
* Responsive behavior verified
* Empty, loading, error states implemented
* Keyboard navigation verified
