# My Budget Mate - Style Guide

## Color Palette

### Primary Colors (Sage)
The sage color palette is used for positive actions, success states, and primary UI elements.

| Name | Hex | Usage |
|------|-----|-------|
| Sage | `#7A9E9A` | Primary buttons, checkmarks, positive indicators |
| Sage Dark | `#5A7E7A` | Button hover states, dark accents |
| Sage Light | `#B8D4D0` | Borders, subtle highlights |
| Sage Very Light | `#E2EEEC` | Backgrounds, selected states |

### Secondary Colors (Blue)
Blue is used for informational content, secondary actions, and neutral states.

| Name | Hex | Usage |
|------|-----|-------|
| Blue | `#6B9ECE` | Info icons, secondary indicators |
| Blue Light | `#DDEAF5` | Info backgrounds, alert backgrounds |

### Accent Colors (Gold)
Gold is used for warnings, celebrations, and attention-grabbing elements.

| Name | Hex | Usage |
|------|-----|-------|
| Gold | `#D4A853` | Warning icons, celebration accents |
| Gold Light | `#F5E6C4` | Warning backgrounds |
| Gold Dark | `#8B7035` | Warning text |

### Neutral Colors (Silver)
Silver is used for neutral states and secondary importance indicators.

| Name | Hex | Usage |
|------|-----|-------|
| Silver | `#9CA3AF` | Neutral indicators, secondary importance |
| Silver Light | `#E5E7EB` | Neutral borders |
| Silver Very Light | `#F3F4F6` | Neutral backgrounds |

### Text Colors
| Name | Class | Usage |
|------|-------|-------|
| Text Dark | `text-text-dark` | Headlines, important text |
| Text Medium | `text-text-medium` | Body text, descriptions |
| Muted | `text-muted-foreground` | Secondary text, labels |

---

## Button Styles

### Primary Action Buttons
Used for: **Save**, **Continue**, **Accept**, **Submit**, **Confirm**, **Create**, **Add**, **Update**, **Finish**, **Complete**, **Done**, **Apply**, **Next**

```tsx
<Button className="bg-[#7A9E9A] hover:bg-[#5A7E7A]">
  Save Changes
</Button>
```

### Full Width Primary Button
```tsx
<Button className="w-full bg-[#7A9E9A] hover:bg-[#5A7E7A]">
  Continue
</Button>
```

### Outline Button with Sage Accent
Used for secondary actions that still need sage styling.

```tsx
<Button
  variant="outline"
  className="border-[#7A9E9A] text-[#5A7E7A] hover:bg-[#E2EEEC]"
>
  Add Surplus Envelope
</Button>
```

### Destructive Button
Keep default destructive styling for delete actions.

```tsx
<Button variant="destructive">
  Delete
</Button>
```

### Ghost Button
Keep default ghost styling for cancel and secondary actions.

```tsx
<Button variant="ghost">
  Cancel
</Button>
```

---

## Card & Selection States

### Selected Card
```tsx
<Card className="border-2 border-[#7A9E9A] bg-[#E2EEEC]">
  {/* Card content */}
</Card>
```

### Hover State for Cards
```tsx
<Card className="hover:border-[#B8D4D0] hover:shadow-lg">
  {/* Card content */}
</Card>
```

### Info Card
```tsx
<div className="bg-[#DDEAF5] border border-[#6B9ECE] rounded-lg p-4">
  <Info className="h-5 w-5 text-[#6B9ECE]" />
  {/* Info content */}
</div>
```

### Warning Card
```tsx
<div className="bg-[#F5E6C4] border border-[#D4A853] rounded-lg p-4">
  <AlertTriangle className="h-5 w-5 text-[#D4A853]" />
  {/* Warning content */}
</div>
```

### Success Card
```tsx
<div className="bg-[#E2EEEC] border border-[#B8D4D0] rounded-lg p-4">
  <Check className="h-5 w-5 text-[#7A9E9A]" />
  {/* Success content */}
</div>
```

---

## Icons & Indicators

### Success Check Icon
```tsx
<Check className="h-5 w-5 text-[#7A9E9A]" />
<CheckCircle2 className="h-5 w-5 text-[#7A9E9A]" />
```

### Info Icon
```tsx
<Info className="h-5 w-5 text-[#6B9ECE]" />
```

### Warning Icon
```tsx
<AlertTriangle className="h-5 w-5 text-[#D4A853]" />
```

### Priority Colors

Used for categorising envelopes by importance level.

| Priority | Name | Dot Color | Background | Border | Use Case |
|----------|------|-----------|------------|--------|----------|
| 1 | **Essential** | `sage-dark` (#5A7E7A) | `sage-very-light` (#E2EEEC) | `sage-light` (#B8D4D0) | Must-pay items: rent, groceries, utilities |
| 2 | **Important** | `silver` (#9CA3AF) | `silver-very-light` (#F3F4F6) | `silver-light` (#E5E7EB) | Should-pay items: insurance, savings, debt |
| 3 | **Extras** | `blue` (#6B9ECE) | `blue-light` (#DDEAF5) | `blue` (#6B9ECE) | Nice-to-have: fun money, hobbies, treats |

#### Priority Color Psychology

- **Sage (Essential)** — Positive, secure. Communicates "these are covered, you're safe."
- **Silver (Important)** — Neutral, stable. Communicates "steady progress, keep going."
- **Blue (Extras)** — Informational, flexible. Communicates "adjust freely, no guilt."

#### Usage Examples

**Group Headers:**
```tsx
{/* Essential */}
<div className="bg-[#E2EEEC] border border-[#B8D4D0]">...</div>

{/* Important */}
<div className="bg-[#F3F4F6] border border-[#E5E7EB]">...</div>

{/* Extras */}
<div className="bg-[#DDEAF5] border border-[#6B9ECE]">...</div>
```

**Priority Dots:**
```tsx
{/* Essential */}
<span className="w-3 h-3 rounded-full bg-[#5A7E7A]" />

{/* Important */}
<span className="w-3 h-3 rounded-full bg-[#9CA3AF]" />

{/* Extras */}
<span className="w-3 h-3 rounded-full bg-[#6B9ECE]" />
```

**Row Icons:**
```tsx
{/* Essential */}
<div className="bg-[#E2EEEC] rounded-lg p-2">...</div>

{/* Important */}
<div className="bg-[#F3F4F6] rounded-lg p-2">...</div>

{/* Extras */}
<div className="bg-[#DDEAF5] rounded-lg p-2">...</div>
```

---

## Progress Indicators

### Default Progress Bar (Sage)
```tsx
<Progress
  value={progress}
  className="h-3 [&>div]:bg-[#7A9E9A]"
/>
```

### Over-budget Progress Bar (Blue)
```tsx
<Progress
  value={progress}
  className="h-3 [&>div]:bg-[#6B9ECE]"
/>
```

---

## Form Inputs

### Standard Input
Use default shadcn/ui Input styling.

### Focus States
Inputs should use sage accent on focus:
```tsx
<Input className="focus:ring-[#7A9E9A] focus:border-[#7A9E9A]" />
```

---

## Checkbox Selection

### Selected Checkbox Badge
```tsx
<div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#7A9E9A] flex items-center justify-center shadow">
  <Check className="h-4 w-4 text-white" />
</div>
```

---

## Typography

### Page Headers
```tsx
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-bold">Section Title</h2>
```

### Subheadings
```tsx
<h3 className="font-semibold text-lg">Subsection</h3>
```

### Body Text
```tsx
<p className="text-muted-foreground">Description text</p>
<p className="text-sm text-muted-foreground">Small description</p>
```

---

## Status Indicators

### Budget Status Colors

| Status | Background | Border | Text |
|--------|------------|--------|------|
| On Track | `bg-[#E2EEEC]` | `border-[#B8D4D0]` | `text-[#5A7E7A]` |
| Under Budget | `bg-[#F5E6C4]` | `border-[#D4A853]` | `text-[#8B7035]` |
| Over Budget | `bg-[#DDEAF5]` | `border-[#6B9ECE]` | `text-[#6B9ECE]` |

---

## Recommended Badge
```tsx
<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7A9E9A] text-white text-xs font-medium px-3 py-1 rounded-full">
  Recommended
</div>
```

---

## Summary

**Always use sage (`#7A9E9A`) for:**
- Primary action buttons (Save, Continue, Submit, etc.)
- Success indicators
- Selected states
- Positive feedback

**Use blue (`#6B9ECE`) for:**
- Informational messages
- Secondary/neutral states
- Over-budget indicators

**Use gold (`#D4A853`) for:**
- Warnings
- Celebrations/achievements
- Attention-grabbing elements

**Keep default styles for:**
- Cancel/ghost buttons
- Destructive actions (delete)
- Standard outline buttons without sage accent
