# Future Features - Parked for Later Development

This document tracks features that have been designed but deferred for future implementation. These features are not abandoned - they're waiting for the right time to be built.

---

## Currently Archived Features (January 2026)

These features are temporarily disabled in the UI:

| Feature | Status | Location | Reason |
|---------|--------|----------|--------|
| Avatar Shop | Archived | `/kids/[childId]/shop` | Shows "Coming Soon" message |
| Star Currency | Hidden | Kid Dashboard | Removed from UI display |
| Screen Time Rewards | Archived | `/kids/screen-time-requests` | Redirects to Kids Setup |
| Screen Time Balance | Hidden | Kid Dashboard | Removed from UI display |

**Note**: Database tables and API routes are preserved for future re-enabling.

---

## Kids Gamification Suite (Young Children Focus)

**Target Audience**: Children under 10 who don't have bank accounts yet

**Why Parked**: Current focus is on teens with real bank accounts learning actual money management. These features serve younger children who aren't ready for real financial concepts.

**Re-enable When**: Expanding to serve families with younger children who need motivation-based reward systems rather than real money tracking.

### Avatar Shop

A 4-tier cosmetic item shop where children spend Stars earned from chores.

**Features**:
- 4 tier progression system (Starter → Premium items)
- Categories: avatars, clothing, room items, pets, accessories, themes
- Items unlock based on achievement progress
- Custom items can be created by parents

**Database Tables** (already created):
- `avatar_shop_items` - Shop inventory
- `child_avatar_inventory` - Purchased items per child
- `child_room_layout` - Room customization state

**Files to Modify**:
- `components/avatar-shop/*` - Currently hidden, needs implementation
- `app/(app)/kids/[childId]/shop/*` - Shop pages
- `app/api/avatar-shop/*` - Shop APIs

### Star Currency System

Virtual currency for younger children who aren't ready for real money.

**Features**:
- Earn Stars from completing chores
- Spend Stars in Avatar Shop
- Bonus Stars from achievements
- Parent can award bonus Stars

**Database Tables** (already created):
- `star_transactions` - Star earning/spending log
- `child_profiles.star_balance` - Current balance

### Screen Time Rewards

Earn screen time minutes from chores instead of money.

**Features**:
- Chores can reward screen time minutes
- Request/approval workflow with parents
- Balance tracking and history
- Parent can grant/deduct minutes

**Database Tables** (already created):
- `screen_time_transactions` - Minutes earned/spent
- `screen_time_requests` - Kid requests, parent approves
- `child_profiles.screen_time_balance` - Current balance

### Virtual Room Customization

Personalize a virtual room with purchased items.

**Features**:
- Place furniture and decorations
- Equip avatar with clothing
- Apply room themes
- Pet companions

**Database Tables** (already created):
- `child_room_layout` - Item placements and equipped items

---

## Kids Module v2: Preteen Mode

**Target Audience**: Preteens (10-13) who want to learn budgeting but don't have bank accounts yet

**Why Parked**: Need to prove the teen (real bank accounts) model first before adding complexity.

**Re-enable When**: Teen module is stable and families request a stepping stone for younger kids.

### Virtual Envelope System

Manual tracking without real bank accounts.

**Features**:
- Parent manually records pocket money deposits
- Kid manually categorizes spending
- Virtual Spend/Save/Invest/Give envelopes
- Simulated balance tracking
- Teaches the concepts before real money

### Simplified Transaction Entry

Kid-friendly transaction recording.

**Features**:
- Big buttons for common categories
- Photo receipt capture
- Parent verification workflow
- Weekly reconciliation prompts

### Goal Visualization

Visual savings progress for younger kids.

**Features**:
- Picture-based goals (not just dollar amounts)
- Progress bars with celebrations
- Milestone markers
- "Time until goal" estimates

---

## Household Hub Enhancements

### Smart Shopping Suggestions

AI-powered shopping list assistance.

**Why Parked**: Core shopping functionality needs to be solid first.

**Features**:
- Suggest items based on meal plan
- "Running low" detection from purchase history
- Seasonal item suggestions
- Recipe ingredient auto-add

### Family Budget Visibility

Let family members see (not edit) parts of the budget.

**Why Parked**: Privacy and permission model complexity.

**Features**:
- Selective envelope visibility for partner/spouse
- Read-only dashboard for accountability partners
- Shared goal tracking
- Joint expense categories

### Meal Cost Integration

Connect meal planning to budget.

**Why Parked**: Need stable meal planning first.

**Features**:
- Estimate meal costs from recipe ingredients
- Weekly meal budget tracking
- Compare planned vs actual grocery spend
- "Cheaper alternative" suggestions

---

## Technical Debt Notes

When re-enabling these features, consider:

1. **Star Currency**: The `star_transactions` table exists but may need optimization for high-volume queries
2. **Avatar Shop**: The seed data in migration 0043 is comprehensive but may need updating for new themes
3. **Screen Time**: The request/approval workflow needs mobile-friendly UI
4. **Room Customization**: The JSONB `room_item_placements` field needs a good visual editor

---

## Implementation Priority (When Ready)

1. **Preteen Mode** - Logical stepping stone for families
2. **Star Currency + Avatar Shop** - Already 80% built, just needs UI
3. **Screen Time Rewards** - Popular request from families
4. **Room Customization** - Fun but not essential
5. **Household Hub Enhancements** - Nice-to-have once core is stable

---

*Last Updated: January 2026*
