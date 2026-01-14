# Akahu Accreditation Guide

This document outlines the requirements for Akahu app accreditation and the status of My Budget Mate's compliance.

## Access Level Requested

**Type**: Read-Only Access

**Permissions Requested**:
- Account information (names, types, balances)
- Transaction history (merchant, amount, date, memo)

**Not Requested**:
- Payment initiation
- Account modifications
- Write access of any kind

**Note**: Read-only access has less strict MFA requirements (username + password acceptable), but we exceed these requirements with TOTP-based 2FA and 2-hour session timeouts.

---

## Accreditation Requirements Overview

| Requirement | Status | Details |
|-------------|--------|---------|
| Privacy Notice | ✅ Complete | `/privacy` page with Akahu data disclosure |
| Consumer Information Page | ✅ Complete | `/about/bank-connection` page |
| Security/Penetration Testing | ⏳ Pending | Grey-box pentest required (may be lighter for read-only access - confirm with Akahu) |
| Application Review Access | ✅ Ready | Production URL available |
| MFA Implementation | ✅ Complete | TOTP-based 2FA with 2-hour session timeout |
| Token Revocation Handling | ✅ Complete | Graceful 401 handling with user alerts |
| Consumer Controls | ✅ Complete | Account revocation, status display |

---

## 1. Privacy Notice

**Location**: `/privacy` (public page)

**Requirements Met**:
- Explains data exchanged via Akahu
- Links to Akahu's privacy policy
- Describes what data is collected
- Outlines data retention policies
- Explains user rights for data access/deletion

**URL**: `https://mybudgetmate.co.nz/privacy`

---

## 2. Consumer Information Page

**Location**: `/about/bank-connection` (public page)

**Requirements Met**:
- Explains how financial account access works
- Describes relationship with Akahu
- Details security measures (encryption, 2FA, read-only access)
- Provides FAQs about bank connections
- Links to Akahu's website

**URL**: `https://mybudgetmate.co.nz/about/bank-connection`

---

## 3. Security & Penetration Testing

**Status**: Pending

**Requirements**:
- Grey-box penetration testing of user-facing application and APIs
- OR SOC 2 / ISO 27001 certification

**Next Steps**:
1. Commission a security assessment from a reputable NZ security firm
2. Provide the assessment report to Akahu

**Recommended Providers** (NZ-based):
- Aura Information Security
- ZX Security
- Insomnia Security
- Lateral Security

**Estimated Cost**: NZ$3,000 - $10,000

---

## 4. Application Review Access

**Providing Access to Akahu**:

### Option A: Production Access (Recommended)
1. Provide Akahu with the production URL: `https://mybudgetmate.co.nz`
2. Create a demo account for Akahu reviewers:
   - Email: `akahu-review@mybudgetmate.co.nz`
   - Provide temporary password via secure channel

### Option B: Staging Environment
1. Deploy to staging URL: `https://staging.mybudgetmate.co.nz`
2. Configure staging Akahu credentials
3. Provide access credentials to Akahu

### Demo Account Setup Checklist
- [ ] Create demo user account
- [ ] Pre-populate with sample data (envelopes, transactions)
- [ ] Enable 2FA on the demo account
- [ ] Document test flows for Akahu reviewers

---

## 5. Authentication Requirements

### Multi-Factor Authentication
**Status**: ✅ Complete

**Implementation**:
- TOTP-based authenticator app support
- Backup codes for account recovery
- 2FA setup wizard during onboarding/settings

**Files**:
- `components/auth/two-factor-auth-setup.tsx`
- `app/api/2fa/setup/route.ts`
- `app/api/2fa/verify/route.ts`
- `app/api/2fa/status/route.ts`

### MFA Session Timeout (2-hour requirement)
**Status**: ✅ Complete

**Implementation**:
- MFA verification timestamp tracked in httpOnly cookie
- Session expires after 2 hours of MFA verification
- Re-verification prompt for sensitive operations (bank connections)
- Time remaining displayed to users

**Files**:
- `lib/utils/mfa-session.ts`
- `app/api/2fa/verify-session/route.ts`
- `components/auth/mfa-session-prompt.tsx`

---

## 6. Token Revocation Handling

**Status**: ✅ Complete

**Requirements**:
- Handle external token revocation gracefully
- Alert users when account status becomes inactive
- Provide easy path to re-authorize

**Implementation**:
- `AkahuApiError` class for structured error handling
- 401/403 responses trigger "action_required" status
- Invalid tokens are cleared from database
- User-facing alerts guide to reconnection

**Files**:
- `lib/akahu/client.ts` - AkahuApiError class
- `app/api/akahu/connection/route.ts` - Revocation handling
- `components/bank/bank-connection-alert.tsx` - User alerts

### Webhook Integration (Optional Enhancement)

Akahu supports webhooks as an alternative to polling for revocation events:

- [ ] Subscribe to Akahu webhooks for real-time revocation events
- [ ] Handle `TOKEN_REVOKED` event type
- [ ] Handle `ACCOUNT_DISCONNECTED` event type
- [ ] Implement webhook signature verification

**Note**: Currently using 401 response handling. Webhooks would provide faster revocation detection.

### Inactive Account Alerts

- **Detection**: 401 responses trigger "action_required" status
- **UI Alert**: Banner on dashboard when accounts need attention
- **User Guidance**: Clear messaging about re-authorization steps
- **Email Notification**: (Optional) Email users when connection becomes stale

---

## 7. Consumer Controls

**Status**: ✅ Complete

### Account Access Summary
- Bank Connection Manager shows all connected accounts
- Status indicators: Connected, Disconnected, Action Required, Issues

### Account Revocation
- Individual account disconnection
- Bulk disconnection option
- Confirmation before revocation
- Data cleanup after disconnection

### External Revocation Handling
- App handles external revocation gracefully (if user revokes via Akahu directly)
- Clear messaging about re-authorization steps
- Primary connection management happens within My Budget Mate (per Akahu recommendation)

**Files**:
- `components/bank/bank-connection-manager.tsx`
- `components/bank/bank-connection-alert.tsx`
- `app/api/akahu/connection/route.ts`

---

## 8. Privacy Act 2020 Compliance

**Data Retention**:
- Transaction data retained while account is active
- Data deleted when user disconnects bank or deletes account
- Cascade delete on Supabase enforces cleanup

**User Rights**:
- Data export available via Settings
- Account deletion removes all associated data
- Contact email provided for manual requests

### Account Deletion Flow

Akahu requires "complete data deletion upon account termination". Our implementation:

1. User requests deletion via Settings or email to privacy@mybudgetmate.co.nz
2. All Akahu tokens revoked via API
3. All transaction data deleted (Supabase cascade delete)
4. All account connection records deleted
5. All envelope allocations and budget data deleted
6. User profile and auth records deleted
7. Confirmation email sent to user

---

## Accreditation Application Checklist

Before submitting to Akahu:

### Documents to Provide
- [ ] Link to privacy policy: `https://mybudgetmate.co.nz/privacy`
- [ ] Link to consumer information page: `https://mybudgetmate.co.nz/about/bank-connection`
- [ ] Link to terms of service: `https://mybudgetmate.co.nz/terms`
- [ ] Security assessment report (pending)

### Access to Provide
- [ ] Production URL with demo account credentials
- [ ] (Optional) TestFlight build for iOS
- [ ] (Optional) APK for Android

### Technical Requirements
- [x] SSL/TLS encryption on all traffic
- [x] App credentials server-side only
- [x] OAuth state parameter implementation
- [x] OWASP Top 10 mitigation
- [x] MFA implementation
- [x] 2-hour MFA session timeout
- [x] Token revocation handling
- [x] User connection status alerts

---

## Contact Information

**Akahu Developer Support**:
- Email: developers@akahu.io
- Documentation: https://developers.akahu.nz/docs
- App Accreditation Guide: https://developers.akahu.nz/docs/app-accreditation

**My Budget Mate Contacts**:
- Technical: [your-email]
- Privacy: privacy@mybudgetmate.co.nz
- Support: support@mybudgetmate.co.nz
- Website: https://mybudgetmate.co.nz

---

## Next Steps

1. **Commission Penetration Test**
   - Contact security firm
   - Schedule grey-box assessment
   - Budget: NZ$3,000-10,000

2. **Prepare Demo Account**
   - Create akahu-review@mybudgetmate.co.nz
   - Enable 2FA
   - Populate with sample data

3. **Submit Application**
   - Complete Akahu accreditation form
   - Attach all required documents
   - Provide access credentials

4. **Review Period**
   - Typical: 2-4 weeks
   - Be responsive to questions
   - Address any feedback promptly

---

## Draft Email to Akahu

**Subject:** Akahu App Accreditation Request – My Budget Mate (Read-Only Access for Beta)

---

Hi Akahu Team,

I'm reaching out to request app accreditation for **My Budget Mate**, a personal budgeting application designed specifically for New Zealand households.

### About My Budget Mate

My Budget Mate is an envelope-based budgeting app that helps Kiwi families manage their money using a "pay cycle" approach – allocating income into purpose-specific envelopes (bills, spending, savings, goals) so users always know where their money is going.

**Key features:**
- **Envelope budgeting** – Users allocate income to virtual envelopes for bills, spending, savings, and goals
- **Pay cycle alignment** – Budgets sync with how NZers actually get paid (weekly, fortnightly, monthly)
- **Automatic reconciliation** – Bank transactions flow into a queue where users match them to envelopes
- **Financial position tracking** – Net worth, assets, and liabilities overview
- **Kids module** – Teaching teens money management with chore tracking and invoicing (beta)

**Target users:** NZ households, particularly families managing multiple incomes and expenses.

### Access Level Requested

We are requesting **read-only access** for our beta testing phase. Specifically:

- **Account information** – Account names, types, and balances
- **Transaction history** – Merchant names, amounts, dates, and bank memos

We do **not** require any write access. My Budget Mate cannot and will not move money, make payments, or modify bank accounts in any way in it's Beta phase.

### Current Status

- **Platform:** Web application (Next.js 14, hosted on Vercel)
- **Stage:** Private beta ready for testing
- **Authentication:** We require 2FA (TOTP via authenticator apps) for all users connecting bank accounts
- **Hosting:** Vercel with data centres in the Australia/New Zealand region

### Security Measures

- **TLS 1.2+ encryption** for all traffic
- **Server-side credential handling** – Akahu App Secret and User Access Tokens are never exposed to the client
- **OAuth implementation** with proper state parameter usage
- **OWASP Top 10 compliance** – We follow security best practices
- **No bank credential storage** – User authentication happens directly with Akahu

### Consumer Control

Our application provides:
- **Connection management** – Users can view, add, or disconnect bank connections from their Settings page
- **Selective account access** – Users choose which accounts to connect
- **External revocation support** – We inform users they can revoke access via my.akahu.nz
- **Data deletion** – When users disconnect accounts or delete their My Budget Mate account, associated data is removed
- **Token revocation handling** – We handle 401 responses gracefully and alert users to reconnect

### Documentation

- **Consumer Information Page:** https://mybudgetmate.co.nz/about/bank-connection – Explains how bank connections work, what data we access, and security measures
- **Privacy Policy:** https://mybudgetmate.co.nz/privacy
- **Terms of Service:** https://mybudgetmate.co.nz/terms

### What We're Hoping For

As a small NZ startup in beta, we'd appreciate guidance on:

1. **Read-only accreditation process** – We understand this has less strict requirements than full read/write access
2. **Beta phase considerations** – Any accommodations for early-stage apps with limited user bases
3. **Penetration testing requirements** – Timing and scope expectations for read-only access
4. **Timeline** – Approximate timeframes for the review process

### Next Steps

I'm happy to:
- Provide a staging environment URL with test login credentials
- Submit our privacy notice documentation
- Answer any questions about our architecture or security approach

Thank you for considering our application. We're committed to providing a secure, user-friendly experience and are excited to partner with Akahu to bring My Budget Mate to NZ budgeters.

Kind regards,

Deb Hoffman
Founder, My Budget Mate
hoff1997@gmail.com
021371709
