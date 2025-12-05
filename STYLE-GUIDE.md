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

*Last updated: December 2024*
