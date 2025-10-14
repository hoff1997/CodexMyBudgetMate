# Akahu Bank Connection Setup Guide

## Overview

This guide will help you set up Akahu bank connections for automatic transaction imports from New Zealand banks using Direct API tokens.

## Prerequisites

1. **Akahu Account**: Register at [https://my.akahu.io](https://my.akahu.io)
2. **API Access**: Request API access for your personal account
3. **API Credentials**: Obtain your Base URL, App Token, and User Token

## Step-by-Step Setup

### 1. Create Akahu Account

1. Visit [https://my.akahu.io](https://my.akahu.io)
2. Sign up for a personal Akahu account
3. Complete email verification process
4. Connect your bank accounts through the Akahu interface

### 2. Request API Access

1. Contact Akahu support to request API access for your account
2. Explain you want to build a personal budgeting application
3. Once approved, you'll receive API credentials

### 3. Get API Credentials

You'll receive three key pieces of information:

1. **Base URL**: Usually `https://api.akahu.io`
2. **App Token**: Your application authentication token
3. **User Token**: Your personal user access token

### 4. Configure in My Budget Mate

1. Open your My Budget Mate application
2. Navigate to **Settings** → **Banks**
3. In the "Akahu API Configuration" section:
   - Enter your **Akahu Base URL**
   - Enter your **Akahu App Token**
   - Enter your **Akahu User Token**

### 5. Test Connection

1. Click "Test Connection" to verify your credentials
2. If successful, your connected bank accounts will appear automatically

## Supported Banks

Akahu supports all major New Zealand banks:

- **ANZ**: All account types (checking, savings, credit cards)
- **ASB**: All account types 
- **BNZ**: All account types
- **Westpac**: All account types
- **Kiwibank**: All account types
- **TSB**: All account types
- **SBS**: All account types
- **Cooperative Bank**: All account types
- **Heartland Bank**: Selected products

## Bank Connection Process

1. In My Budget Mate, go to **Settings** → **Banks**
2. Enter your API credentials in the "Akahu API Configuration" section
3. Click "Test Connection" to verify credentials
4. Your connected bank accounts will automatically appear in the list
5. Bank transaction sync will begin automatically

## Security & Privacy

### Data Security
- All bank connections use OAuth 2.0 with bank-grade security
- My Budget Mate never stores your banking passwords
- Access tokens are encrypted and stored securely
- All communication uses HTTPS/TLS encryption

### Permission Scope
My Budget Mate requests minimal permissions:
- **Read-only access** to account balances
- **Read-only access** to transaction history
- **No ability** to initiate payments or transfers

### Data Retention
- Transaction data is stored locally in your application
- Bank credentials are handled entirely by Akahu
- You can disconnect banks at any time

## Troubleshooting

### Connection Errors

**Error: "Invalid App ID or Secret"**
- Verify your Akahu credentials in Settings
- Ensure App ID starts with `app_` and Secret starts with `secret_`
- Check that your Akahu app is active

**Error: "Redirect URL Mismatch"**
- Verify redirect URL in your Akahu app matches exactly
- Include the full URL including protocol (http/https)

**Error: "Bank Connection Failed"**
- Try again - temporary bank system issues are common
- Check if your bank account is accessible via online banking
- Ensure you're using correct bank login credentials

### Sync Issues

**No new transactions appearing**
- Check "Last Sync" date in bank connection settings
- Manually trigger sync using "Sync" button
- Verify date range in sync settings

**Duplicate transactions**
- Review duplicate detection settings
- Check transaction dates and amounts
- Use duplicate resolution dialog to merge/delete

### Production vs Test Mode

**Test Mode (Sandbox)**
- Uses demo bank accounts and test data
- Safe for development and testing
- No real bank connections

**Production Mode**
- Requires Akahu app approval for production use
- Connects to real bank accounts
- Subject to Akahu's review process

## Support & Resources

- **Akahu Documentation**: [https://developers.akahu.io/docs](https://developers.akahu.io/docs)
- **Akahu API Reference**: [https://developers.akahu.io/reference](https://developers.akahu.io/reference)
- **Akahu Support**: [support@akahu.io](mailto:support@akahu.io)

## Rate Limits & Quotas

- **Sandbox**: 1000 API calls per day
- **Production**: Higher limits based on approval
- **Connection Refresh**: Once per 90 days
- **Transaction Sync**: Up to 4 times per day

## Getting Production Approval

To connect real bank accounts:

1. Complete your Akahu app development
2. Submit for production review
3. Provide app description and use case
4. Demonstrate security measures
5. Wait for approval (typically 5-10 business days)
6. Update API mode from sandbox to production

---

**Note**: This setup enables secure, read-only access to your bank accounts for automatic transaction importing. All bank connections are managed through Akahu's regulated and secure platform.