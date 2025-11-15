# Email Strategy for My Budget Mate

## Overview

This document outlines the email strategy for My Budget Mate, designed to complement in-app gamification and nurture users based on their last activity context. The strategy is **persona-aware**, **action-triggered**, and always **empowering, never shaming**.

## Core Principles

1. **Empowerment Over Shame**: All emails celebrate progress and encourage next steps
2. **Context-Aware**: Triggered by user's last activity and current state
3. **Persona-Adapted**: Content matches user's financial literacy level
4. **Action-Focused**: Every email has a clear, achievable call-to-action
5. **Achievement Integration**: Emails tie into the badge/gamification system

## Email Types

### 1. Onboarding Sequence

#### Email 1: Welcome & First Win
**Trigger**: User completes onboarding
**Timing**: Immediate
**Subject**: "🎉 Welcome to My Budget Mate - You're already winning!"

**Content**:
- Celebrate onboarding completion
- Show "Journey Begins" achievement badge
- Remind of selected persona and data choice
- CTA: "Create Your First Envelope" or "Import Your First Transaction"

**Persona Variations**:
- **Beginner**: Focus on simplicity, include "What is an envelope?" explainer
- **Optimiser**: Reference their existing budgeting experience
- **Wealth Builder**: Highlight advanced features they'll unlock

---

#### Email 2: First Envelope Created
**Trigger**: User creates their first envelope
**Timing**: 1 hour after creation

**Content**:
- Celebrate "First Envelope" achievement
- Explain how envelopes organize money
- CTA: "Create 2 More Envelopes to Unlock Goals"

---

#### Email 3: Goals Feature Unlocked
**Trigger**: User unlocks goals feature (3+ envelopes)
**Timing**: Immediate

**Content**:
- Celebrate unlocking new feature
- Show "Feature Explorer" badge
- Explain goal-setting power
- CTA: "Set Your First Goal"

---

### 2. Nurture Campaigns (Based on Last Activity)

#### Campaign: Inactive After Onboarding
**Trigger**: Completed onboarding but no activity in 3 days
**Subject**: "Your budget is waiting! Here's your next easy win 🌟"

**Content**:
- Reference where they left off (from `last_activity_context`)
- Show what they've already achieved (badges earned)
- Suggest 1-2 specific next actions
- CTA: "Continue Your Journey"

**Example Context-Aware Variations**:
- Last action: `onboarding_complete` → "Create your first envelope"
- Last action: `envelope_created` → "Add your first transaction"
- Last action: `transaction_added` → "Create 2 more envelopes to unlock Goals"

---

#### Campaign: Demo Mode User (Conversion)
**Trigger**: Demo mode user active for 7 days, no conversion
**Subject**: "Ready to track your real budget? Here's what you'll keep 🚀"

**Content**:
- Celebrate demo exploration
- Show achievements they've earned (will transfer)
- Highlight progress made (X envelopes, Y transactions tested)
- Explain conversion is seamless
- CTA: "Switch to Real Data" or "Connect My Bank"

**Urgency Hook**: "Your demo achievements will be preserved!"

---

#### Campaign: Stuck on Goal Creation
**Trigger**: Goals unlocked for 5 days, but no goal created
**Subject**: "What's your next big win? Let's set a goal together 🎯"

**Content**:
- Celebrate unlocking goals feature
- Share inspiring example goals (persona-specific)
- "Starting small is powerful" messaging
- CTA: "Set Your First Goal"

**Persona Examples**:
- **Beginner**: "Save $500 for emergencies"
- **Optimiser**: "Build a $3,000 travel fund"
- **Wealth Builder**: "Grow investment buffer to $10,000"

---

### 3. Achievement Celebration Emails

#### Weekly Achievement Digest
**Trigger**: User earned 2+ achievements in past week
**Timing**: Sunday evening
**Subject**: "This week you earned [X] achievements! 🏆"

**Content**:
- Visual badge showcase
- Total points and tier progress
- "You're building momentum!" messaging
- Show next tier milestone
- CTA: "Share Your Badges" (Discord integration)

---

#### Tier Level-Up
**Trigger**: User reaches new tier (Bronze → Silver → Gold → Platinum → Diamond)
**Timing**: Immediate
**Subject**: "🎉 You've reached [Tier Level]! Major milestone unlocked"

**Content**:
- Celebrate tier achievement with visual
- Show total points and badges earned
- Reference journey so far ("Since you started [X] weeks ago...")
- CTA: "Share Your Achievement" or "See Your Badge Collection"

---

### 4. Re-Engagement Campaigns

#### 14-Day Inactive
**Trigger**: No login for 14 days
**Subject**: "We miss you! Your budget progress is safe 💚"

**Content**:
- Warm, non-judgemental tone
- Show preserved achievements and data
- "Life gets busy - we get it" messaging
- Highlight what's new since they left
- CTA: "Check In On Your Budget"

---

#### 30-Day Inactive (Last Chance)
**Trigger**: No login for 30 days
**Subject**: "Your financial momentum is waiting - pick up where you left off 🌱"

**Content**:
- Celebrate past achievements
- Show specific last action (from `last_activity_context`)
- "No pressure, no judgement" messaging
- CTA: "Resume Your Journey"

**Persona-Specific Empathy**:
- **Beginner**: "Starting again is part of the journey"
- **Optimiser**: "Even optimisers need breaks - welcome back"
- **Wealth Builder**: "Your data and progress are ready when you are"

---

### 5. Milestone & Streak Emails

#### First 7-Day Streak
**Trigger**: User logs in 7 consecutive days
**Subject**: "7 days strong! You're building a habit 🔥"

**Content**:
- Celebrate "Week Warrior" achievement
- Explain power of consistency
- Show streak progress
- CTA: "Keep The Streak Going"

---

#### Pay Cycle Completed
**Trigger**: User completes first full pay cycle with budget tracking
**Subject**: "You did it! Your first complete pay cycle tracked 🎯"

**Content**:
- Celebrate milestone achievement
- Show summary stats (envelopes used, transactions tracked)
- "You're gaining clarity" messaging
- CTA: "Review Your Pay Cycle" or "Plan Next Cycle"

---

#### First Goal Reached
**Trigger**: User achieves their first goal milestone
**Subject**: "🎉 Goal achieved! This is what momentum looks like"

**Content**:
- Huge celebration tone
- Visual progress bar showing completion
- "You proved you can do this" messaging
- Encourage setting next goal
- CTA: "Set Your Next Goal" or "Share Your Win"

---

## Technical Implementation Notes

### Data Sources

All email triggers pull from these database fields:

```sql
-- User state
profiles.user_persona
profiles.onboarding_completed
profiles.last_activity_context (jsonb)
profiles.created_at

-- Achievement data
user_achievements.achievement_key
user_achievements.earned_at
user_achievements.points

-- Demo mode tracking
demo_mode_sessions.started_at
demo_mode_sessions.converted_at
demo_mode_sessions.session_metadata

-- Feature unlocks
user_progress.feature_key
user_progress.unlocked_at

-- Engagement tracking
user_progress.last_used_at
user_progress.usage_count
```

### Email Triggers (Examples)

#### Onboarding Complete
```typescript
// Triggered in: app/api/onboarding/complete/route.ts
if (onboardingJustCompleted) {
  await emailService.send({
    template: 'onboarding-welcome',
    to: user.email,
    data: {
      persona: user.persona,
      dataChoice: user.dataChoice,
      firstName: user.firstName,
    },
  });
}
```

#### Achievement Earned
```typescript
// Triggered in: app/api/achievements/award/route.ts
if (newlyEarned) {
  await emailService.send({
    template: 'achievement-earned',
    to: user.email,
    data: {
      achievement: achievement,
      points: achievement.points,
      newTotalPoints: userTotalPoints,
      tier: getTier(userTotalPoints),
    },
  });
}
```

#### Demo Mode Conversion Reminder
```typescript
// Scheduled job: runs daily
const demoUsers = await getDemoUsersActive7Days();

for (const user of demoUsers) {
  await emailService.send({
    template: 'demo-conversion-reminder',
    to: user.email,
    data: {
      daysInDemo: user.daysInDemo,
      achievementsEarned: user.achievementCount,
      envelopesCreated: user.envelopeCount,
    },
  });
}
```

### Context-Aware Logic Example

```typescript
// Get user's last activity
const lastActivity = user.last_activity_context;

// Determine next step based on context
let emailTemplate;
let nextAction;

switch (lastActivity.action) {
  case 'onboarding_complete':
    emailTemplate = 'next-step-envelope';
    nextAction = 'Create your first envelope';
    break;

  case 'envelope_created':
    if (user.envelopeCount < 3) {
      emailTemplate = 'next-step-more-envelopes';
      nextAction = 'Create 2 more envelopes to unlock Goals';
    } else {
      emailTemplate = 'next-step-transaction';
      nextAction = 'Add your first transaction';
    }
    break;

  case 'achievement_earned':
    const achievement = lastActivity.achievementKey;
    if (achievement === 'first_goal') {
      emailTemplate = 'celebrate-first-goal';
      nextAction = 'Set another goal or create a debt payoff plan';
    }
    break;

  default:
    emailTemplate = 'generic-checkin';
    nextAction = 'Continue your journey';
}

await emailService.send({
  template: emailTemplate,
  to: user.email,
  data: { nextAction, lastActivity, persona: user.persona },
});
```

## Persona-Specific Tone Guide

### Beginner
- **Tone**: Warm, educational, reassuring
- **Language**: Simple, define terms, step-by-step
- **Examples**: Include "What is..." explainers
- **CTA**: Very specific ("Create your Housing envelope")

### Optimiser
- **Tone**: Encouraging, efficiency-focused
- **Language**: Moderate complexity, assume basic knowledge
- **Examples**: Reference optimization strategies
- **CTA**: Action-oriented ("Optimize your envelopes")

### Wealth Builder
- **Tone**: Professional, strategic
- **Language**: Advanced terms OK, assume high literacy
- **Examples**: Investment, portfolio, wealth-building
- **CTA**: High-level ("Review portfolio allocation")

## Empowering Language Checklist

Every email must follow these guidelines:

### ✅ DO Use These Patterns
- "You're building momentum"
- "Great progress on..."
- "Ready for your next win?"
- "You've unlocked..."
- "Here's what you've achieved so far"
- "You're [X]% closer to..."
- "This is what success looks like"
- "You proved you can do this"

### ❌ NEVER Use These Patterns
- "You haven't completed..."
- "Why aren't you using..."
- "Most users have already..."
- "You're falling behind..."
- "You should have..."
- "Don't forget to..." (use "Ready to..." instead)

## Email Frequency Caps

To avoid overwhelming users:

- **Maximum 2 emails per week** (excluding transactional emails)
- **Achievement digests**: Once per week maximum
- **Nurture emails**: Minimum 3 days between sends
- **Re-engagement**: Maximum 1 per month

Users can adjust preferences:
- Achievements only
- Weekly digest only
- All updates
- Transactional only

## Future Enhancements

### Discord Integration
When user shares achievement to Discord:
- Send confirmation email with link to their Discord post
- Include badge image as email attachment
- Encourage community interaction

### Referral Program
"Share My Budget Mate" emails when user:
- Reaches Gold tier or higher
- Completes first goal
- Celebrates 30-day streak

### Coaching Integration
When coaching feature launches:
- "Ready for 1-on-1 coaching?" after 30 days active
- Match with coach based on persona
- Send coach introduction email

### Seasonal Campaigns
- New Year: "Plan your financial year"
- End of financial year: "Review your progress"
- Holiday season: "Stay on track during holidays"

## Success Metrics

Track these KPIs for each email campaign:

- **Open rate** (target: >30%)
- **Click-through rate** (target: >15%)
- **Conversion rate** (for demo mode emails, target: >20%)
- **Unsubscribe rate** (keep below 2%)
- **Re-engagement success** (% of inactive users who return)

## A/B Testing Ideas

1. **Subject lines**: Emoji vs no emoji
2. **CTA placement**: Top vs bottom
3. **Badge visuals**: Static image vs animated GIF
4. **Tone**: Celebratory vs informative
5. **Length**: Short (< 100 words) vs detailed (> 200 words)

## Infrastructure Requirements

### Email Service Provider
Recommended: SendGrid, Postmark, or AWS SES

Required features:
- Template system with variables
- Scheduled sends (for digests)
- Event tracking (opens, clicks)
- Unsubscribe management
- A/B testing

### Database Schema Additions

```sql
-- Email preferences
CREATE TABLE email_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(user_id),
  achievement_emails boolean DEFAULT true,
  nurture_emails boolean DEFAULT true,
  digest_frequency text DEFAULT 'weekly', -- weekly, never
  updated_at timestamptz DEFAULT now()
);

-- Email tracking
CREATE TABLE email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id),
  template_name text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  context jsonb -- Store what triggered the email
);
```

### Implementation Phases

**Phase 1: Foundation**
- Set up email service provider
- Create email templates
- Implement basic triggers (onboarding, achievements)

**Phase 2: Nurture**
- Context-aware nurture campaigns
- Demo mode conversion emails
- Weekly achievement digests

**Phase 3: Advanced**
- Re-engagement campaigns
- Discord integration
- Persona-specific optimization

**Phase 4: Scale**
- A/B testing framework
- Advanced segmentation
- Predictive send time optimization

---

## Appendix: Template Variables

All email templates should support these variables:

```typescript
interface EmailTemplateData {
  // User data
  firstName: string;
  persona: PersonaType;
  userSince: Date;

  // Achievement data
  achievement?: {
    key: string;
    title: string;
    description: string;
    icon: string;
    points: number;
  };
  totalPoints: number;
  tier: {
    label: string;
    color: string;
  };

  // Progress data
  envelopeCount: number;
  transactionCount: number;
  goalCount: number;
  streakDays: number;

  // Context
  lastActivity: {
    action: string;
    timestamp: string;
    metadata?: any;
  };

  // CTAs
  primaryCTA: {
    text: string;
    url: string;
  };
  secondaryCTA?: {
    text: string;
    url: string;
  };
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Product Team
**Review Frequency**: Quarterly
