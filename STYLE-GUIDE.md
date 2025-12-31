# My Budget Mate — Style Guide

A calm, empowering design system for a budget app that reduces anxiety and encourages positive financial behavior.

---

## Color Philosophy

The color system is built on behavioral psychology principles:

| Color Family | Meaning | When to Use |
|--------------|---------|-------------|
| **Sage** | Positive | Surplus, on track, under budget, funded, primary actions |
| **Blue** | Negative/Info | Debt, over budget, under funded, review items (informational, not punishing) |
| **Silver** | UI Structure | Borders, backgrounds, disabled states, neutral elements |
| **Gold** | Celebration | Major milestones, achievements, debt paid off |

---

## Color Palette

### Sage — Positives

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Sage | `#7A9E9A` | `--sage` | Primary buttons, active states, positive values, progress bar (100%) |
| Sage Dark | `#5A7E7A` | `--sage-dark` | Text links, badge text, button hover |
| Sage Light | `#B8D4D0` | `--sage-light` | Status badges bg, progress bar (50%), success indicators |
| Sage Very Light | `#E2EEEC` | `--sage-very-light` | Progress bar bg, row hover, positive card backgrounds |

### Blue — Negatives / Info

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Blue | `#6B9ECE` | `--blue` | Debt values (even $0), over budget amounts, info icons |
| Blue Light | `#DDEAF5` | `--blue-light` | Review badges bg, negative status bg, info alerts |

### Silver — UI Structure

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Silver | `#9CA3AF` | `--silver` | Borders, disabled text, placeholder text, icons |
| Silver Light | `#E5E7EB` | `--silver-light` | Card borders, dividers, sidebar hover |
| Silver Very Light | `#F3F4F6` | `--silver-very-light` | Sidebar bg, table headers, input backgrounds |

### Gold — Celebrations

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Gold | `#D4A853` | `--gold` | Achievement icons, milestone markers |
| Gold Light | `#F5E6C4` | `--gold-light` | Celebration badges, achievement cards, success toasts |

### Text

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Text Dark | `#3D3D3D` | `--text-dark` | Headings, primary text, important labels |
| Text Medium | `#6B6B6B` | `--text-medium` | Body text, sidebar text, secondary labels |
| Text Light | `#9CA3AF` | `--text-light` | Placeholders, disabled text, meta info |

### Backgrounds

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| White | `#FFFFFF` | `--bg-white` | Main background, cards |

---

## CSS Variables

Add to `globals.css`:

```css
:root {
  /* Sage - Positives */
  --sage: #7A9E9A;
  --sage-dark: #5A7E7A;
  --sage-light: #B8D4D0;
  --sage-very-light: #E2EEEC;
  
  /* Blue - Negatives / Info */
  --blue: #6B9ECE;
  --blue-light: #DDEAF5;
  
  /* Silver - UI Structure */
  --silver: #9CA3AF;
  --silver-light: #E5E7EB;
  --silver-very-light: #F3F4F6;
  
  /* Gold - Celebrations */
  --gold: #D4A853;
  --gold-light: #F5E6C4;
  
  /* Text */
  --text-dark: #3D3D3D;
  --text-medium: #6B6B6B;
  --text-light: #9CA3AF;
  
  /* Background */
  --bg-white: #FFFFFF;
}
```

---

## Tailwind Config

Add to `tailwind.config.js` under `theme.extend.colors`:

```js
colors: {
  sage: {
    DEFAULT: '#7A9E9A',
    dark: '#5A7E7A',
    light: '#B8D4D0',
    'very-light': '#E2EEEC',
  },
  blue: {
    DEFAULT: '#6B9ECE',
    light: '#DDEAF5',
  },
  silver: {
    DEFAULT: '#9CA3AF',
    light: '#E5E7EB',
    'very-light': '#F3F4F6',
  },
  gold: {
    DEFAULT: '#D4A853',
    light: '#F5E6C4',
  },
  text: {
    dark: '#3D3D3D',
    medium: '#6B6B6B',
    light: '#9CA3AF',
  },
}
```

---

## Components

### Buttons

**Primary Button**
- Background: `--sage` (`#7A9E9A`)
- Text: white
- Hover: `#6B8E8A`
- Border radius: 8px

```jsx
<button className="bg-sage hover:bg-[#6B8E8A] text-white px-4 py-2 rounded-lg font-medium">
  Allocate Surplus
</button>
```

**Outline Button**
- Background: transparent
- Border: `--silver` (`#9CA3AF`)
- Text: `--text-medium`
- Hover: border `--sage`, text `--sage`

```jsx
<button className="border border-silver hover:border-sage text-text-medium hover:text-sage px-4 py-2 rounded-lg font-medium">
  View Summary
</button>
```

**Text Link**
- Color: `--sage-dark` (`#5A7E7A`)
- Hover: underline

```jsx
<a className="text-sage-dark hover:underline font-medium">+ Add Income</a>
```

---

### Badges

**Positive Badge** (surplus, on track)
- Background: `--sage-very-light`
- Border: `--sage-light`
- Text: `--sage-dark`

```jsx
<span className="bg-sage-very-light border border-sage-light text-sage-dark px-3 py-1 rounded-full text-sm font-medium">
  + Surplus: $500
</span>
```

**Negative Badge** (review, over budget)
- Background: `--blue-light`
- Border: `--blue`
- Text: `#4A7BA8`

```jsx
<span className="bg-blue-light border border-blue text-[#4A7BA8] px-3 py-1 rounded-full text-sm font-medium">
  To review (15)
</span>
```

**Celebration Badge** (milestones)
- Background: `--gold-light`
- Border: `--gold`
- Text: `#8B7035`

```jsx
<span className="bg-gold-light border border-gold text-[#8B7035] px-3 py-1 rounded-full text-sm font-medium">
  🎉 Goal reached!
</span>
```

---

### Status Pills

**On Track**
- Background: `--sage-light`
- Text: `--sage-dark`

```jsx
<span className="bg-sage-light text-sage-dark px-2 py-1 rounded-full text-xs font-medium">
  On track
</span>
```

**Needs Review / Over / Under**
- Background: `--blue-light`
- Text: `#4A7BA8`

```jsx
<span className="bg-blue-light text-[#4A7BA8] px-2 py-1 rounded-full text-xs font-medium">
  Over $60
</span>
```

---

### Progress Bar

The progress bar uses a light-to-dark sage gradient. Always positive — just showing intensity of progress.

- Background: `--sage-very-light`
- Fill: gradient from `--sage-very-light` → `--sage-light` → `--sage`

```jsx
<div className="h-2 bg-sage-very-light rounded-full overflow-hidden">
  <div 
    className="h-full rounded-full"
    style={{
      width: '75%',
      background: 'linear-gradient(90deg, #E2EEEC 0%, #B8D4D0 50%, #7A9E9A 100%)'
    }}
  />
</div>
```

---

### Sidebar

- Background: `--silver-very-light` (`#F3F4F6`)
- Text: `--text-medium` (`#6B6B6B`)
- Hover: `--silver-light` (`#E5E7EB`)
- Active: white background, left border `--sage`, font-medium

```jsx
<aside className="bg-silver-very-light w-56 border-r border-silver-light">
  <nav>
    <a className="block px-5 py-3 text-text-medium hover:bg-silver-light">
      Dashboard
    </a>
    <a className="block px-5 py-3 bg-white text-text-dark font-medium border-l-3 border-sage">
      Budget Manager
    </a>
  </nav>
</aside>
```

---

### Cards

- Background: white
- Border: `--silver-light`
- Border radius: 12px
- Shadow: subtle (`shadow-sm`)

```jsx
<div className="bg-white border border-silver-light rounded-xl p-5 shadow-sm">
  <div className="text-text-medium text-sm">Balance</div>
  <div className="text-sage text-2xl font-semibold">$500.00</div>
</div>
```

---

### Values

**Positive Values** (surplus, funded, under budget)
- Color: `--sage`
- Font weight: 600

**Negative Values** (debt, over budget)
- Color: `--blue`
- Font weight: 600

**Neutral Values** (zero, no data)
- Color: `--text-light`

```jsx
<span className="text-sage font-semibold">$250.00</span>    {/* funded */}
<span className="text-blue font-semibold">$0.00</span>      {/* debt */}
<span className="text-text-light">$0.00</span>              {/* empty */}
```

---

### Table Headers

- Background: `--silver-very-light`
- Text: `--text-medium`
- Border bottom: `--silver-light`

---

### Row Hover

- Background: `--sage-very-light`

---

## Quick Reference

| Element | Color | Hex |
|---------|-------|-----|
| Primary button | Sage | `#7A9E9A` |
| Action links | Sage Dark | `#5A7E7A` |
| Positive values | Sage | `#7A9E9A` |
| Positive badges bg | Sage Very Light | `#E2EEEC` |
| Debt / negative values | Blue | `#6B9ECE` |
| Negative badges bg | Blue Light | `#DDEAF5` |
| Sidebar background | Silver Very Light | `#F3F4F6` |
| Card borders | Silver Light | `#E5E7EB` |
| Main background | White | `#FFFFFF` |
| Headings | Text Dark | `#3D3D3D` |
| Body text | Text Medium | `#6B6B6B` |
| Placeholders | Text Light | `#9CA3AF` |
| Celebrations | Gold Light | `#F5E6C4` |

---

## Priority Colors

Used for categorising envelopes by importance level.

| Priority | Name | Dot Color | Background | Border | Use Case |
|----------|------|-----------|------------|--------|----------|
| 1 | **Essential** | `sage-dark` (#5A7E7A) | `sage-very-light` (#E2EEEC) | `sage-light` (#B8D4D0) | Must-pay items: rent, groceries, utilities |
| 2 | **Important** | `silver` (#9CA3AF) | `silver-very-light` (#F3F4F6) | `silver-light` (#E5E7EB) | Should-pay items: insurance, savings, debt |
| 3 | **Flexible** | `blue` (#6B9ECE) | `blue-light` (#DDEAF5) | `blue` (#6B9ECE) | Nice-to-have: fun money, hobbies, treats |

### Priority Color Psychology

- **Sage (Essential)** — Positive, secure. Communicates "these are covered, you're safe."
- **Silver (Important)** — Neutral, stable. Communicates "steady progress, keep going."
- **Blue (Flexible)** — Informational, flexible. Communicates "adjust freely, no guilt."

### Usage Examples

**Group Headers:**
```jsx
{/* Essential */}
<div className="bg-sage-very-light border border-sage-light">...</div>

{/* Important */}
<div className="bg-silver-very-light border border-silver-light">...</div>

{/* Flexible */}
<div className="bg-blue-light border border-blue">...</div>
```

**Priority Dots:**
```jsx
{/* Essential */}
<span className="w-3 h-3 rounded-full bg-sage-dark" />

{/* Important */}
<span className="w-3 h-3 rounded-full bg-silver" />

{/* Flexible */}
<span className="w-3 h-3 rounded-full bg-blue" />
```

**Row Icons:**
```jsx
{/* Essential */}
<div className="bg-sage-very-light rounded-lg p-2">...</div>

{/* Important */}
<div className="bg-silver-very-light rounded-lg p-2">...</div>

{/* Flexible */}
<div className="bg-blue-light rounded-lg p-2">...</div>
```

---

## Usage with Claude Code

When asking Claude Code to update components, reference this guide:

```
Update the Budget Manager sidebar to match the style guide:
- Background: silver-very-light (#F3F4F6)
- Active item: white with sage left border
- Use text-medium for labels
```

Or:

```
Apply the style guide color system to the envelope summary cards.
Positive amounts should use sage, debt should use blue.
```

---

## Highlight & Focus States

### Newly Created Item Highlight
Used to draw attention to newly created items (e.g., after creating an envelope):

- Ring: `ring-2 ring-sage ring-offset-1`
- Background: `bg-sage-very-light`
- Animation: `animate-pulse` (auto-removes after 3 seconds)

```jsx
<tr className={cn(
  "hover:bg-sage-very-light",
  isHighlighted && "ring-2 ring-sage ring-offset-1 bg-sage-very-light animate-pulse"
)}>
  {/* Row content */}
</tr>
```

### Scroll Into View
Highlighted items should auto-scroll:

```tsx
useEffect(() => {
  if (isHighlighted && rowRef.current) {
    rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, [isHighlighted]);
```

---

## Income & Budget Impact Patterns

### Income Reality Banner
Shows income surplus/commitment information in dialogs:

- Background: `bg-blue-light/30` (`#DDEAF5` at 30% opacity)
- Border: `border-blue-light`
- Text: `text-blue` for values, `text-text-medium` for labels

```jsx
<div className="rounded-xl border border-blue-light bg-blue-light/30 p-4">
  <div className="text-xs uppercase tracking-wide text-text-medium mb-2">
    Your new pay cycle commitment
  </div>
  <div className="flex items-center justify-between">
    <span className="text-sm text-text-dark">Income Name:</span>
    <span className="font-semibold text-blue">$XX.XX per pay</span>
  </div>
</div>
```

### Budget Shortfall Warning
Used when user's surplus can't cover a new commitment:

- Background: `bg-gold-light/30` (`#F5E6C4` at 30% opacity)
- Border: `border-gold`
- Icon: `AlertCircle` with `text-gold`

```jsx
<div className="rounded-xl border border-gold bg-gold-light/30 p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-text-dark">Budget Needs Balancing</h4>
      <p className="text-sm text-text-dark">
        Still to find <strong>$XX.XX</strong>
      </p>
    </div>
  </div>
</div>
```

### Success Confirmation
Used when budget action succeeds:

- Background: `bg-sage-very-light`
- Border: `border-sage-light`
- Icon: `CheckCircle2` with `text-sage`

```jsx
<div className="rounded-xl border border-sage-light bg-sage-very-light p-4">
  <div className="flex items-center gap-3">
    <CheckCircle2 className="h-6 w-6 text-sage" />
    <div>
      <h3 className="font-semibold text-text-dark">Envelope Created!</h3>
      <p className="text-sm text-text-medium">Now let's balance your budget</p>
    </div>
  </div>
</div>
```

---

## Dialog & Popover Patterns

### Modal Date Picker
For date pickers inside dialogs, use modal mode to prevent overflow:

```jsx
<Popover modal={true}>
  <PopoverTrigger asChild>
    <Button variant="outline" className="justify-between">
      {date ? format(date, 'PPP') : 'Pick a date'}
      <CalendarIcon className="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent
    className="p-0 z-[100]"
    sideOffset={8}
    align="start"
    side="bottom"
    avoidCollisions={true}
    collisionPadding={16}
  >
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>
```

Key props:
- `modal={true}` - Keeps popover within dialog stacking context
- `z-[100]` - Ensures popover appears above dialog content
- `avoidCollisions={true}` - Prevents calendar from appearing outside viewport
- `collisionPadding={16}` - Adds safe margin from viewport edges

---

## Envelope Type Badges

### Priority Traffic Light System
Compact visual priority indicators:

| Priority | Dot Color | CSS |
|----------|-----------|-----|
| Essential | Sage Dark | `bg-sage-dark` or `bg-[#5A7E7A]` |
| Important | Silver | `bg-silver` or `bg-[#9CA3AF]` |
| Discretionary | Blue | `bg-blue` or `bg-[#6B9ECE]` |

```jsx
// Compact dot (in table)
<span className={cn(
  "w-2.5 h-2.5 rounded-full",
  priority === "essential" && "bg-sage-dark",
  priority === "important" && "bg-silver",
  priority === "discretionary" && "bg-blue"
)} />
```

---

## Remy Components

### RemyTip Background
Remy's coaching tips use a distinct sage-tinted style:

- Background: `bg-sage-very-light` (`#E2EEEC`)
- Border: `border-sage-light` (`#B8D4D0`)
- Text: `text-sage-dark` (`#5A7E7A`)
- Signature: `text-sage` (`#7A9E9A`)

```jsx
<div className="flex gap-3 rounded-2xl border border-sage-light bg-sage-very-light p-4">
  <img src="/Images/remy-encouraging.png" className="w-12 h-12" />
  <div className="flex-1">
    <p className="text-sm text-sage-dark">Remy's tip message...</p>
    <p className="text-xs text-sage mt-1 italic">— Remy</p>
  </div>
</div>
```

---

*Last updated: December 2025*
