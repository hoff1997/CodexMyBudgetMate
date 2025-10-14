# My Budget Mate Application

## Overview

This is a full-stack personal budgeting application built with a modern tech stack. The application allows users to manage their finances using the envelope budgeting method, where users allocate money to different "envelopes" (categories) for spending control. The app is branded as "My Budget Mate" with customizable budget names for personal branding.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Pattern**: RESTful API design
- **Session Management**: Express sessions with PostgreSQL store

### Project Structure
- **Monorepo**: Single repository with shared types and schemas
- **Client**: React frontend in `/client` directory
- **Server**: Express backend in `/server` directory
- **Shared**: Common types and database schema in `/shared` directory

## Key Components

### Database Schema
The application uses a comprehensive database schema with the following main entities:
- **Users**: User authentication and profile management
- **Accounts**: Different financial accounts (checking, savings, credit)
- **Envelopes**: Budget categories with allocated amounts and current balances
- **Transactions**: Financial transactions linked to accounts
- **Transaction Envelopes**: Many-to-many relationship between transactions and envelopes
- **Category Rules**: Automated categorization rules for transactions

### API Endpoints
- **User Management**: `/api/user` - Get current user information
- **Accounts**: `/api/accounts` - CRUD operations for financial accounts
- **Envelopes**: `/api/envelopes` - CRUD operations for budget envelopes
- **Transactions**: `/api/transactions` - Transaction management and approval workflow

### Frontend Features
- **Responsive Design**: Mobile-first approach with dedicated mobile navigation
- **Dashboard**: Overview of financial status with statistics cards
- **Envelope Management**: Visual envelope cards showing budget vs. actual spending
- **Transaction Approval**: Pending transaction review system
- **Real-time Updates**: Query invalidation for immediate UI updates

## Data Flow

1. **User Authentication**: Currently uses a demo user (ID: 1) for development will use supabase once complete
2. **Transaction Creation**: Users create transactions that require approval
3. **Envelope Assignment**: Transactions are assigned to specific envelopes
4. **Balance Updates**: Approved transactions update both account and envelope balances
5. **Real-time Sync**: Frontend queries automatically refresh after mutations

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL for data persistence
- **ORM**: Drizzle ORM for type-safe database operations
- **UI Library**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS for utility-first styling
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

### Development Tools
- **TypeScript**: Full type safety across the stack
- **Vite**: Fast development server and build tool
- **ESBuild**: Production server bundling
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20
- **Database**: PostgreSQL 16 module
- **Development Server**: Runs on port 5000 with Vite HMR
- **Auto-reload**: TSX for TypeScript execution with hot reload

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations applied via `npm run db:push`
- **Deployment**: Replit autoscale deployment target

### Environment Configuration
- **Development**: `NODE_ENV=development` with TSX execution
- **Production**: `NODE_ENV=production` with compiled JavaScript
- **Database**: `DATABASE_URL` environment variable required

## Recent Changes

Changelog:
- June 22, 2025: Initial setup
- June 22, 2025: Enhanced Quick Add form with date picker and receipt upload functionality
- June 22, 2025: Created condensed envelope overview widget with account filtering
- June 22, 2025: Added file upload support for receipts with 5MB limit and image validation
- June 22, 2025: Fixed DOM nesting warnings in navigation components
- June 22, 2025: Implemented merchant memory system with automatic envelope suggestions
- June 22, 2025: Split transaction fields into merchant and optional description
- June 22, 2025: Created rule system for automatic merchant-to-envelope categorization
- June 22, 2025: Built comprehensive reconciliation page showing bank vs envelope balance discrepancies
- June 22, 2025: Added reconciliation status to dashboard stats with real-time balance checking
- June 22, 2025: Redesigned envelope page with tabular layout showing clear over/under budget columns
- June 22, 2025: Built envelope transfer system with double-entry ledger view for rebalancing funds
- June 22, 2025: Updated dashboard stats to show envelope health (on track vs overspent) instead of budget totals
- June 22, 2025: Added credit card holding account system for tracking credit card spending vs cash flow
- June 22, 2025: Created envelope transfer report with CSV export for planning manual transfers
- June 22, 2025: Built comprehensive settings page with account preferences and data management
- June 22, 2025: Added credit card holding account widget to dashboard showing payment readiness
- June 22, 2025: Added contextual help tooltips throughout the app with usage tips and guidance
- June 22, 2025: Created comprehensive "Start Here" setup screen with account opening balances and envelope budget calculator
- June 22, 2025: Implemented drag-and-drop envelope categorization system with collapsible category headers
- June 22, 2025: Added hamburger menu to mobile header with full navigation and collapsible desktop sidebar
- June 22, 2025: Redesigned dashboard widgets with compact 2-row layout showing envelope stats and balance information
- June 22, 2025: Populated system with complete user envelope list from uploaded Excel file (100+ envelopes organized into 7 categories)
- June 22, 2025: Enhanced envelopes page with ultra-compact table-like layout inspired by GoodBudget, showing envelopes as minimal rows with budget/balance columns and thin progress bars for maximum density
- June 22, 2025: Added drag-and-drop functionality to category headers with edit buttons, allowing categories to be reordered and customized easily
- June 22, 2025: Added collapse/expand all button to quickly manage category visibility and removed debug information box for cleaner interface
- June 22, 2025: Added new envelope creation functionality with form fields for name, icon, budget amount, and category assignment
- June 22, 2025: Reorganised interface layout with improved header structure, dedicated transfer section, and repositioned collapse/expand controls for better usability
- June 22, 2025: Updated all text to use New Zealand English spelling (organise, colour, etc.)
- June 22, 2025: Changed "History" tab to "Transactions" throughout the application
- June 22, 2025: Implemented envelope edit functionality with opening balances, budget scheduling (weekly/monthly/fortnightly/quarterly/annual), next payment due dates, and spending account flag for no predicted spend budget
- June 22, 2025: Added dynamic payment date calculation system that automatically updates due dates based on frequency (weekly/fortnightly/monthly/quarterly/annual) with real-time scheduling and visual indicators showing days until next payment
- June 22, 2025: Replaced condensed envelope overview on dashboard with monitored envelopes widget, added monitoring flag to envelope schema, and enabled monitoring for Groceries and Spending Deb envelopes by default
- June 22, 2025: Moved transaction reports functionality to the transactions page with enhanced filtering including envelope selection, search functionality, date range filtering, account filtering, pagination (25/50/200 transactions), CSV export, and quick date range preset buttons
- June 22, 2025: Created comprehensive envelope balance report page accessible from envelopes page, showing all envelope balances in debit/credit format with category grouping, totals calculation, print functionality, and CSV export to Excel
- June 22, 2025: Enhanced transaction search to include amount searching without $ sign and fixed search functionality to work independently of date range filters
- June 22, 2025: Added ultra-compact single-line transaction display with clear button (X) in search field for quick clearing
- June 22, 2025: Updated account name from "Main Checking" to "ASB Everyday Account" and populated system with 10 realistic NZ demo transactions
- June 22, 2025: Enhanced hamburger menu and sidebar navigation with user profile section, quick actions (Getting Started, Balance Report), account management (Profile, Settings, Help & Support), and organised sections with separators and app version display
- June 22, 2025: Added comprehensive Accounts page for managing bank accounts with opening balances, account types (checking, savings, credit, investment), CRUD operations, total balance summary, and bank connection setup guidance
- June 22, 2025: Added clickable envelope links that navigate to transaction page with pre-filtered results for the specific envelope, enhancing navigation between envelopes and their related transactions
- June 22, 2025: Successfully implemented envelope-to-transaction filtering with "View Transactions" buttons on envelope rows, fixed transaction envelope data population in storage layer, and corrected demo data to properly link grocery transactions (Countdown, New World) to Groceries envelope
- June 22, 2025: Enhanced plus button with contextual quick-add dropdown menus for transactions, envelopes, accounts, and categories
- June 22, 2025: Added overspent envelope analysis dialog with detailed breakdown and auto-balance feature that intelligently transfers surplus funds to cover overspent amounts
- June 22, 2025: Implemented Akahu bank connection integration in settings page with support for all major NZ banks (ANZ, ASB, BNZ, Westpac, Kiwibank), secure OAuth connections, automatic transaction sync, and comprehensive bank management interface
- June 22, 2025: Built comprehensive duplicate detection system for bank sync that recognizes manual entries, prevents duplicates using merchant normalization, amount/date matching with fuzzy logic, auto-merges exact matches, flags potential duplicates for review, and includes duplicate resolution dialog with merge/keep/delete options
- June 22, 2025: Reduced dashboard stats boxes by 50% for mobile app view with compact padding, smaller text sizes, and responsive scaling for better mobile experience
- June 22, 2025: Created comprehensive reconciliation centre as the new default landing page, replacing dashboard as main screen, with complete transaction listing, pagination (25/50/100/200), advanced filtering (unmatched, pending review, matched/approved), search functionality, reconciliation status summary cards, and mobile-optimized layout
- June 22, 2025: Added quick envelope and category creation directly within transaction forms, allowing users to create new envelopes without leaving the transaction window, with automatic assignment of newly created envelopes to the current transaction and budget amount pre-filled from transaction amount
- June 22, 2025: Created 5 demo unmatched bank sync transactions (Uber Eats, Mitre 10, Westfield parking, Chemist Warehouse, Coffee Supreme) to demonstrate reconciliation filtering functionality with different merchant types and amounts ranging from $4-$157
- June 22, 2025: Added inline envelope allocation interface to reconciliation page with envelope assignment, transaction splitting capability, amount validation, and direct approve button for streamlined transaction processing without leaving the page
- June 22, 2025: Optimized envelope allocation interface for mobile devices with full-width dropdowns, stacked layout for amount inputs, responsive button placement, and touch-friendly controls for seamless mobile reconciliation experience
- June 22, 2025: Added optional description field to transaction allocation interface with compact mobile layout, reduced padding and button sizes, inline envelope/amount selection, and streamlined approve workflow for efficient mobile reconciliation
- June 23, 2025: Fixed mobile transaction layout to prevent text overlap by restructuring with two-row design, moving status badge to separate line, and optimizing spacing for mobile screens with clear envelope selection placeholder text
- June 23, 2025: Added click-through filtering functionality to reconciliation summary cards, allowing users to click on Total, Pending, or Unmatched cards to automatically filter transactions with visual ring indicators showing active filters
- June 23, 2025: Updated mobile bottom navigation menu order to Dashboard, Reconcile, Add, Envelopes, Transactions and enhanced plus button with quick actions sheet for creating new transactions, envelopes, and categories
- June 23, 2025: Implemented comprehensive labels library feature with database schema for labels and transaction labels, API endpoints for CRUD operations, TransactionLabels component for assignment/creation, LabelManager component for settings management, and integration across all transaction windows with color-coded labels and searchable interface
- June 23, 2025: Enhanced all envelope selection interfaces with text-based search functionality using Command components, allowing users to type characters like "g" to filter envelopes starting with that letter, applied to reconciliation allocation dropdowns and transaction filtering interfaces
- June 23, 2025: Pivoted from allocation button to inline envelope editing on all transaction rows (pending and approved), added popup warning when editing approved transactions with override capability, and added edit buttons to transaction rows throughout the app for quick changes
- June 23, 2025: Added comprehensive transaction splitting functionality to transactions page edit interface with smart remaining amount calculation, visual validation indicators (over/under allocated amounts), and enhanced split management with remove buttons and remaining balance tracking
- June 23, 2025: Enhanced UI with text-based buttons replacing icons ("Split" and "Labels" buttons), added label name display with custom colors on both transaction and reconciliation pages, and implemented smart close button behavior in label dialogs (OK checkmark when labels selected, X when none selected)
- June 23, 2025: Updated approve button behavior on both reconciliation and transactions pages to only show for approved transactions when edits are made, with button text changing to "Update" for edited approved transactions and clean interface without unnecessary approve buttons
- June 23, 2025: Added visual feedback for update button with green styling when edits are made to approved transactions, button returns to normal grey after successful update, and implemented proper state clearing after transaction approval to reset edit indicators
- June 23, 2025: Fixed update button functionality with proper state clearing after successful approval, resolved missing function errors, and ensured green button disappears after transaction updates are saved
- June 23, 2025: Completely resolved transaction editing system - fixed duplicate envelope creation bug by implementing proper deleteTransactionEnvelopes method, added missing updateTransaction method to storage layer, fixed validation logic to use absolute values preventing false over-allocation warnings, and added 2-second auto-dismiss for success toast notifications
- June 23, 2025: Enhanced all envelope dropdown selectors throughout the application with searchable Command components, enabling users to quickly find envelopes by typing characters to filter the list, applied to both transaction and reconciliation pages including split allocation interfaces
- June 23, 2025: Added quick approve functionality to transactions page with green checkmark button for pending transactions that have pre-populated envelope suggestions from merchant memory, allowing single-click approval when system suggestions are correct
- June 23, 2025: Created comprehensive Zero Budget Manager as second tab on envelopes page featuring real-time income vs expense tracking, celebration component for achieving zero budget, overspend alerts with suggestions, surplus allocation tool, editable budget amounts with history tracking, visual progress indicators, and clear separation between income and expense envelopes with category grouping
- June 23, 2025: Added prominent Zero Budget Status Widget to dashboard as the primary UI element, showing real-time budget status (zero budget achieved, overspent, or surplus available), budget utilisation progress bar, income vs expense breakdown, and contextual action buttons for budget management
- June 23, 2025: Added Budget button to mobile navigation and completely redesigned Net Worth page with comprehensive asset/liability tracking, real-time net worth calculations, asset allocation pie charts, trend analysis with snapshots, CRUD operations for assets and liabilities, and interactive forms for adding financial items with proper categorisation
- June 23, 2025: Created comprehensive debt freedom support system with Debt Freedom Dashboard showing debt overview, progress milestones, urgent action alerts, and debt payoff calculator with snowball/avalanche strategies, interest savings calculations, and timeline projections to help users achieve debt freedom goals
- June 23, 2025: Fixed Net Worth API storage implementations and created dedicated Debt Management page with navigation menu items in sidebar and mobile header, featuring milestone tracking, debt overview metrics, payoff calculators, and actionable quick actions for users prioritizing debt elimination
- June 23, 2025: Enhanced plus button dropdown menus in both mobile and desktop headers with comprehensive quick actions including Add Transaction, Add Envelope, Add Category, Add Account, Transfer Between Envelopes, and Add Asset/Liability for streamlined user workflow
- June 23, 2025: Removed plus button from mobile bottom navigation menu to simplify the interface and reduce clutter, quick actions remain available via header plus button
- June 23, 2025: Added comprehensive debt demo data including 4 realistic NZ debt liabilities (ANZ Credit Card, Westpac Personal Loan, StudyLink Student Loan, Harvey Norman Store Card) with appropriate interest rates and minimum payments, plus 3 debt payment envelopes for testing debt management tools
- June 23, 2025: Created comprehensive marketing features list (FEATURES_MARKETING.md) with detailed explanations of all application capabilities, target user benefits, and technical excellence points for promotional and sales purposes
- June 23, 2025: Synchronized desktop sidebar navigation with mobile hamburger menu order and structure, making Reconcile the primary navigation item and adding missing pages (Recurring Income, Reports, Rules) for consistent cross-device experience
- June 23, 2025: Removed account selector box from desktop sidebar for cleaner interface and added "Add Category" option to mobile quick actions dropdown for complete mobile functionality
- June 23, 2025: Changed all references from "checking account" to "main account" in setup function and accounts page for clearer terminology, maintaining backwards compatibility for existing data
- June 23, 2025: Updated account types to Bank, Credit Card, Investment, Liability, Cash with appropriate icons and removed placeholder text from account name fields for user input flexibility
- June 23, 2025: Moved "Getting Started" to the top of both mobile hamburger menu and desktop sidebar navigation for prominent positioning
- June 23, 2025: Repositioned "Balance Report" to appear directly under "Envelopes" in both navigation menus for logical grouping
- June 23, 2025: Condensed transaction rows on reconciliation page to single-row layout with minimal padding, compact envelope selector, inline status badges, and icon-based action buttons for significant space reduction
- June 24, 2025: Implemented aligned grid layout for reconciliation transactions with proper column structure - merchant/date/account (6 cols), amount (1 col), label indicators (1 col), envelope selector (3 cols), and action buttons (1 col) for clean visual alignment
- June 24, 2025: Redesigned reconciliation layout to two-line format with minimal padding - top line shows transaction info and amount, bottom line contains envelope selector and action buttons for better space utilisation while maintaining readability
- June 24, 2025: Changed unmatched transaction status badge from "!" symbol to "Unmatched" text for clearer identification
- June 24, 2025: Updated approved transaction status badge to show "Reconciled" in blue styling instead of checkmark symbol, matching the text format of "Unmatched" badge
- June 24, 2025: Changed approve button text from "✓" symbol to "Approve" for clearer action identification
- June 24, 2025: Enhanced label display on reconciliation page to show label text alongside colored indicators on the first line for better visibility
- June 24, 2025: Standardized approve and update button widths with centered text for consistent visual presentation
- June 24, 2025: Added left margin indentation to envelope selector on second line for improved visual hierarchy
- June 24, 2025: Implemented expandable split interface with dynamic envelope allocation, allowing users to click Split button to open detailed split management with add/remove functionality and remaining amount tracking
- June 24, 2025: Fixed split interface positioning to appear underneath transaction rows instead of alongside them, with proper visual separation using background highlighting and border styling
- June 24, 2025: Enhanced split interface with empty default amounts and comprehensive balance indicator showing transaction total, allocated amount, and remaining balance with color-coded status (green for complete, blue for remaining, red for over-allocated)
- June 24, 2025: Updated Split and Labels buttons to outlined style with borders and hover effects, made Split button show active state when enabled, and changed label selection checkmarks from blue to green for better visual feedback
- June 24, 2025: Replaced check/X icon close button in label dialogs with "OK" button and ensured selected label checkmarks are green across both reconciliation and transactions pages
- June 24, 2025: Updated reconciliation page search interface to match compact single-row design from transactions page with inline filters and clear button for space efficiency
- June 24, 2025: Condensed reconciliation status boxes with reduced padding (p-2), smaller text and icons, tighter gaps, and truncated labels to save significant vertical screen space
- June 24, 2025: Enhanced reconciliation page search to match transactions page features including date range filters, envelope multi-select, clear all filters, and CSV export functionality
- June 24, 2025: Condensed reconciliation search box to match compact single-row design from transactions page, removing Card wrapper and using minimal spacing for better screen utilization
- June 24, 2025: Enlarged date boxes to display full date format (dd/MM/yyyy) with proper minimum width and moved pagination control to fit on the second filter row for better space utilization
- June 24, 2025: Optimized status boxes for mobile view with single-row layout, minimal padding (p-1), smaller icons, abbreviated text, and responsive design that expands on desktop
- June 24, 2025: Made matched status box clickable with filter functionality, added visual ring indicator when active, and restored out of balance difference amount display
- June 24, 2025: Fixed pending transaction filtering and status display to properly distinguish between unmatched (no envelope assignments) and pending (has envelope assignments from merchant memory but not approved) transactions, updated reconciliation summary calculations to correctly count each category
- June 24, 2025: Updated pending status badges to use yellow color scheme matching the status box (yellow background, yellow text) for visual consistency
- June 24, 2025: Fixed transaction status logic to properly categorize transactions - Reconciled: approved AND has envelope assignments, Pending: not approved BUT has envelope assignments, Unmatched: no envelope assignments regardless of approval status
- June 24, 2025: Updated approved status box to filter approved transactions only and changed status label from "Reconciled" to "Approved" for clarity
- June 24, 2025: Fixed mobile scrolling issues on reconciliation page by adding overflow controls, constraining widths, and ensuring proper text truncation to prevent horizontal overflow
- June 24, 2025: Added mobile bottom padding to reconciliation page to ensure full scroll access above the bottom navigation bar
- June 24, 2025: Rebranded application from "Envelope Budget" to "My Budget Mate" across all page headers, sidebar, and documentation
- June 24, 2025: Added customizable budget name setting in user schema and settings page, allowing users to personalise their budget name (e.g., "Hoffman Household Budget")
- June 24, 2025: Created API endpoint for updating user settings including budget name and pay cycle preferences
- June 24, 2025: Condensed Zero Budget Status widget to 1/4 size with minimal padding, smaller text, compact layout, and repositioned it in a 4-column grid layout alongside stats cards for better space utilization on dashboard
- June 24, 2025: Expanded Zero Budget Status widget to full page width with horizontal 3-column layout showing income, expenses, and difference side-by-side for better visibility
- June 24, 2025: Further reduced padding in Zero Budget Status widget with minimal header/content padding (pt-2, pb-1, py-1), smaller text (text-xs), reduced gaps, and thinner progress bar (h-1) for ultra-compact layout
- June 24, 2025: Applied compact styling to stats cards below budget status with reduced padding (pt-2, pb-1, py-1), smaller text (text-xs), smaller icons (h-3 w-3), reduced font sizes (text-lg), and minimal gaps (gap-2) to match budget status widget sizing
- June 24, 2025: Condensed pending transactions alert box with minimal padding matching other compact widgets, added clickable functionality to navigate to reconciliation page, and updated styling to match compact dashboard design
- June 24, 2025: Redesigned pending transactions alert to single-row layout with left-aligned title/badge and right-aligned attention count for maximum space efficiency
- June 24, 2025: Increased Zero Budget Status widget progress bar height from h-1 to h-3 for better visibility
- June 24, 2025: Redesigned stats cards to two-line layout with icons on first line and values/details on second line, making cards more compact while maintaining readability
- June 24, 2025: Positioned icons in top-right corner of stats boxes with flex-shrink-0 to prevent icon compression and improved visual alignment
- June 24, 2025: Optimized stats cards for mobile view by shortening titles, hiding secondary text on small screens, and removing crowded details to improve readability
- June 24, 2025: Redesigned stats cards to use three-line layout with title/icon on first line, main value on second line, and descriptive text on third line for better spacing and readability
- June 24, 2025: Split long titles across two rows for Total Envelope Balance, Credit Card Holding, and Total Bank Balance cards for consistent spacing and improved readability
- June 24, 2025: Fixed reconciliation alert box navigation by adding click functionality to navigate to reconciliation-main page with proper hover effects and visual indicators
- June 24, 2025: Transformed quick add transaction form to use compact padding (pt-2 pb-1 px-3 for header, pt-1 pb-2 px-3 for content), smaller text (text-xs), reduced input heights (h-8), and tighter spacing (space-y-2, gap-2) for more efficient space usage
- June 24, 2025: Moved pending transactions widget to appear under the reconciliation alert box on dashboard for better visual hierarchy and logical flow
- June 24, 2025: Removed recent transactions and budget insights boxes from dashboard for cleaner, more focused interface
- June 24, 2025: Removed goals and insights section from dashboard to create minimal, focused interface with essential widgets only
- June 24, 2025: Created comprehensive new transaction dialog component with full form functionality including merchant suggestions, receipt upload, envelope selection, and proper validation - now accessible from hamburger menu "Add Transaction" button
- June 24, 2025: Enhanced new transaction dialog envelope selector with searchable Command interface, inline envelope creation functionality, and improved user experience with visual feedback and validation
- June 24, 2025: Fixed envelope dropdown scrolling issues and made "Create New Envelope" option always visible at bottom with proper styling and functionality
- June 24, 2025: Added receipt upload functionality to transaction edit interface with camera icon, file validation (5MB limit, images only), visual feedback for uploaded receipts, and proper form data handling for API submission
- June 24, 2025: Created comprehensive CSV import functionality in settings page with file validation, preview dialog, format requirements display, and bulk transaction import API endpoint supporting date/merchant/amount/description columns
- June 24, 2025: Modified Balance Report links to open in new tab across sidebar, mobile header, and envelopes page for better user experience
- June 24, 2025: Removed left padding from dashboard and envelope pages to match transactions page layout for consistent spacing
- June 24, 2025: Updated mobile navigation so Budget button navigates to Zero Budget Manager tab and Envelopes button navigates to Envelope Management tab with proper URL parameter handling
- June 24, 2025: Removed large collapse button, adjusted padding, and added compact collapse/expand all button with smaller font on action button row
- June 24, 2025: Consolidated zero budget status and pending transactions widgets with ultra-compact padding (pt-1, pb-1, px-2), reduced text sizes, smaller icons, and minimal spacing to match other pages
- June 24, 2025: Reduced overspending alert box text sizes from text-lg to text-sm, reduced padding to pt-2 pb-1 px-3, and made icons smaller (h-3 w-3) to match compact styling throughout the app
- June 24, 2025: Further reduced status boxes padding on budget page from pt-2 pb-1 px-3 to pt-1 pb-1 px-2, changed text from text-lg to text-sm, reduced icons from h-5 w-5 to h-3 w-3, and decreased gaps/margins for ultra-compact layout
- June 24, 2025: Added Budget menu item to desktop sidebar navigation linking to zero-budget tab (/envelopes-new?tab=zero-budget) with Target icon, positioned between Dashboard and Envelopes for logical flow
- June 25, 2025: Implemented comprehensive Supabase integration with PostgreSQL backend, created complete database schema with all required tables (users, accounts, envelopes, transactions, etc.), built SupabaseStorage class implementing full IStorage interface, added automatic fallback from Supabase to in-memory storage, created initialization system for demo data, and provided complete setup documentation for migrating from local to cloud database storage
- June 25, 2025: Added "Back" button to envelope balance report that remembers and returns user to the last active tab (envelopes or zero-budget) they were viewing, using localStorage and URL parameters for navigation state persistence, positioned prominently above the main header for easy visibility
- June 25, 2025: Enhanced mobile readability across all pages by increasing row spacing from py-1 to py-2/py-3, enlarging input heights from h-7 to h-8/h-9, upgrading button text from text-xs to text-sm on mobile, expanding icon sizes from h-3 w-3 to h-4 w-4 on mobile, improving text contrast with larger font sizes (text-xs to text-sm on mobile), adding proper spacing between elements for better touch accessibility, and implementing responsive design with md: breakpoints to maintain compact desktop layouts
- June 25, 2025: Redesigned transaction pages with condensed three-line layout per transaction: Line 1 shows merchant/description + amount + status badge, Line 2 displays date + account + envelope assignment, Line 3 contains labels + action buttons, maximizing screen space efficiency while maintaining readability and touch accessibility for mobile users
- June 25, 2025: Updated mobile status indicators to use hourglass (⏳) for pending transactions and blue tick (✓) for approved status, while maintaining text labels on desktop view, and changed approve buttons to blue on mobile and green on desktop for consistent visual hierarchy
- June 25, 2025: Optimized mobile transaction layout for screen space by reducing padding from p-2 to p-1, spacing from gap-2 to gap-1, button heights from h-6 to h-5, badge heights from h-4 to h-3, using icon for Labels button (🏷️), showing only 1 label instead of 2 on mobile, and hiding "No labels" text on mobile for ultra-compact three-line layout
- June 25, 2025: Fixed Split button functionality in mobile view by adding missing splitMode state variable, toggleSplitMode function, and mobile-optimized split interface with balance tracking, envelope search, and responsive sizing for transaction splitting on small screens
- June 25, 2025: Removed surplus padding to fill screen margins by reducing container padding from p-4 to p-1 on mobile, card padding from p-6 to p-2, transaction spacing from space-y-1 to space-y-0.5, using border-bottom instead of full borders on mobile, and eliminating card content padding (p-0) for edge-to-edge transaction display
- June 25, 2025: Fixed mobile width overflow on reconciliation page by constraining envelope selector to 50% width, reducing button sizes (h-5 on mobile), using icon labels (🏷️ for Labels, ✓ for Approve), hiding status badge on mobile, and ensuring all action buttons fit within screen margins with proper shrink-0 constraints
- June 25, 2025: Added "My Budget Mate" branding to hamburger menu title on mobile with Scale icon, updated app version footer to show "My Budget Mate v1.0", changed mobile header subtitle from "Personal Budget" to "My Budget Mate", and confirmed desktop sidebar already displays "My Budget Mate" branding consistently across the application
- June 25, 2025: Updated mobile header to display page name as H1 (Dashboard, Reconcile, Envelopes, etc.) with "My Budget Mate" as subheading, expanded getPageTitle function to cover all pages including reconciliation-main, envelopes-new, envelope-balances, debt-management, and setup routes for proper page identification
- June 25, 2025: Fixed Budget page title in mobile header by adding URL parameter detection to getPageTitle function, now properly displays "Budget" as H1 when visiting /envelopes-new?tab=zero-budget route instead of showing "Envelopes"
- June 25, 2025: Updated "Getting Started" links in both sidebar and mobile hamburger menu to open in new tab (target="_blank") alongside existing Balance Report external link behavior for better user experience
- June 25, 2025: Fixed duplicate button issue on reconciliation page desktop view by removing status badge from first line on desktop (keeping only on mobile), eliminating button duplication while maintaining second line action buttons (Split, Labels, Approve) for cleaner desktop interface
- June 25, 2025: Changed "Update" button text to "Edit" on reconciliation page for approved transactions that have been modified, providing clearer indication of the action being performed
- June 25, 2025: Aligned pending/approved status badges and edit/approve buttons to same size (w-16) with center alignment, changed edit button to blue styling to match pending status badge color scheme for consistent visual hierarchy
- June 25, 2025: Changed hourglass icon (⏳) to "Pending" text on mobile reconciliation page status badges to match "Unmatched" text styling for consistent mobile interface design
- June 25, 2025: Changed approved tick icon (✓) to "Approved" text on mobile reconciliation page and aligned all status badges to consistent width (w-16) with center justification for uniform amount box alignment across Unmatched, Pending, and Approved layouts
- June 25, 2025: Restructured mobile reconciliation layout to move amount and status badges (Unmatched/Pending/Approved) to third line, positioned amount text to far right inline with status badges, and kept merchant/description on first line for better mobile space utilization
- June 25, 2025: Moved amount and status badges to line two (hard right) on mobile reconciliation page, added yellow styling for pending button (bg-yellow-100 text-yellow-800 border-yellow-200), and repositioned date/account info to left side of line two for better mobile layout organization
- June 25, 2025: Reduced status badge text size to text-[10px] on mobile reconciliation page to ensure Unmatched/Pending/Approved text fits properly within the w-16 button width
- June 25, 2025: Fixed out of balance amount display in reconciliation status box by replacing truncate with whitespace-nowrap and overflow-hidden to ensure full amount is visible without text cutting off
- June 25, 2025: Further reduced status box text sizes (text-[10px] for status, text-[9px] for difference amount) and used break-all with leading-tight to ensure full difference amount displays properly in compact mobile layout
- June 25, 2025: Fixed envelope names visibility on mobile budget page by restructuring EnvelopeBudgetRow to use two-line layout - line 1 shows envelope name with category, line 2 shows balance/budget/actions with condensed padding and smaller text sizes for mobile optimization
- June 25, 2025: Fixed envelope names visibility on mobile envelope management page by restructuring SortableEnvelopeItem to use responsive two-line layout - line 1 shows drag handle, icon, and envelope name, line 2 shows budget/balance info and action buttons with condensed padding for better mobile readability
- June 25, 2025: Optimized mobile envelope layout by removing budget amount and making balance more prominent on hard right with larger, bold text (text-base font-bold) for quick glance visibility, keeping only progress percentage and action buttons on left side
- June 25, 2025: Moved action buttons (list, edit, delete) to first line hard right on mobile envelope layout for better accessibility and cleaner second line with only progress percentage and balance amount
- June 25, 2025: Enhanced mobile action buttons from 5x5 to 8x8 pixels (h-8 w-8) with larger icons (h-4 w-4) for better touch accessibility while maintaining compact desktop sizes (h-5 w-5) using responsive classes
- June 25, 2025: Removed category cog icon from mobile view (hidden md:block) and enhanced dropdown arrow responsiveness with larger touch target area (p-2 -m-2) and bigger mobile icon size (h-4 w-4) for improved single-tap interaction
- June 25, 2025: Simplified mobile dashboard to show only budget status box and monitored envelopes widget, while keeping desktop version unchanged with all stats cards, pending transactions alert, and quick add form
- June 25, 2025: Enhanced mobile monitored envelopes widget with two-line layout - line 1 shows envelope name and quick-glance balance (hard right), line 2 shows progress bar and under/over budget details, maintaining desktop layout unchanged
- June 25, 2025: Simplified monitored envelopes widget on dashboard by removing status badges and under/over amount details from both mobile and desktop views, showing only envelope name, balance, and progress bar for cleaner interface
- June 25, 2025: Removed progress bars from monitored envelopes widget and added click functionality to navigate to envelope's transaction view, creating ultra-minimal single-line layout with just envelope name, balance, and hover effects
- June 25, 2025: Removed quick add widget from dashboard page for cleaner, more focused interface
- June 25, 2025: Fixed mobile scroll issues on transactions page by adding overflow controls, constraining element widths, ensuring proper text truncation, adding bottom padding for mobile navigation clearance, and preventing horizontal overflow with flex-shrink classes
- June 26, 2025: Implemented comprehensive transaction deletion functionality across both reconciliation and transactions pages with DELETE API endpoint, red trash icon buttons, confirmation dialogs warning "this cannot be reversed", proper cache invalidation, and seamless integration with existing transaction management system
- June 26, 2025: Enhanced setup page income section with dynamic header labels that reflect selected pay frequency (Weekly Income, Fortnightly Income, Monthly Income) for clearer user interface
- June 26, 2025: Implemented connected calculation system in Zero-Based Budget Setup where annual and pay cycle amounts work together - users can edit either field and the other automatically calculates, with inline editing functionality and auto-save capability for all envelope table fields
- June 26, 2025: Updated envelope form default frequency to match Pay Cycle Configuration setting, ensuring new envelopes automatically use the selected pay cycle frequency with form reset when pay cycle changes
- June 26, 2025: Removed Greg's Salary and Deb's Salary from demo data and added "Income" as an envelope type across the app with emerald color scheme (💼 icon, bg-emerald-100 text-emerald-800) for income envelopes
- June 26, 2025: Fixed opening balance persistence issue in Zero-Based Budget Setup by adding missing openingBalance field mapping when loading existing envelopes, ensured handleInlineEdit function properly saves opening balance updates, and confirmed updateEnvelopeMutation sends opening balance data to backend
- June 26, 2025: Simplified due date interface by removing complex dropdown configuration and replacing with simple "Payment Schedule" column showing frequency-based text, removed unnecessary dueDate field from mutation to streamline envelope updates
- June 26, 2025: Restored next due date calculation functionality with automatic payment date calculation based on frequency (weekly, fortnightly, monthly, quarterly, annually), displays frequency name with calculated next payment date underneath for clear scheduling visibility
- June 26, 2025: Implemented comprehensive automatic date advancement system with background scheduler that checks for overdue payment dates hourly and automatically advances them based on frequency (weekly/fortnightly/monthly/quarterly/annually), created date picker interface for user-selectable next payment dates with real-time inline editing and auto-save functionality
- June 26, 2025: Fixed expected balance calculations in Zero-Based Budget Setup to use realistic progress tracking based on opening balance plus monthly progress rather than unrealistic year-to-date accumulation, providing accurate envelope progress status indicators
- June 26, 2025: Fixed critical opening balance calculation issue where opening balance and current balance were disconnected, implemented proper balance adjustment system in backend envelope PATCH endpoint that automatically adjusts current balance when opening balance changes, ensuring proper relationship between opening balance, current balance, and envelope progress tracking
- June 26, 2025: Made Zero-Based Budget Setup table header sticky with proper z-index layering and background styling, allowing header row with column names (Envelope Name, Type, Frequency, Payment Schedule, etc.) to remain visible when scrolling through envelope data for better usability
- June 26, 2025: Enhanced quarterly and annual payment configuration with custom start date support, allowing users to set any date as the starting point for quarterly (every 3 months) or annual (every 12 months) payment schedules instead of fixed calendar patterns, with helper functions calculating next payment dates based on user-defined start dates
- June 26, 2025: Fixed duplicate frequency selector UI issue in Zero-Based Budget Setup by removing redundant "Frequency" column, keeping only the comprehensive "Due Date" and "Payment Schedule" columns for cleaner interface and better user experience
- June 26, 2025: Removed "Due Date" and "Next Due" columns from Zero-Based Budget Setup table to streamline the interface, keeping due date configuration accessible through the "Payment Schedule" column with comprehensive scheduling information and "+ Set Due Date" functionality
- June 26, 2025: Made envelope type field editable in Zero-Based Budget Setup with inline dropdown selection between Income and Expense, allowing users to easily categorize envelopes within the budget planning interface
- June 26, 2025: Enhanced notes functionality in Zero-Based Budget Setup with button-based editing interface and repositioned notes text to display under envelope names for better visual organization
- June 30, 2025: Added logout button to desktop sidebar in user profile section and confirmed mobile hamburger menu already has logout functionality, providing consistent logout access across both desktop and mobile interfaces
- June 26, 2025: Simplified notes edit button to icon-only design with tooltip for cleaner, more compact interface in Zero-Based Budget Setup table
- June 26, 2025: Made delete button much smaller and less prominent with ghost variant, muted colors, and compact 24x24 pixel size for minimal visual impact
- June 26, 2025: Enhanced payment schedule date visibility in Zero-Based Budget Setup table with bold blue text for next payment dates, making scheduled payments clearly visible on each row
- June 26, 2025: Fixed sticky table header in Zero-Based Budget Setup with proper z-index layering, individual cell positioning, and enhanced shadow for reliable header visibility during scrolling
- June 26, 2025: Enhanced sticky table header with stronger positioning, better visual separation, column borders, and improved container structure for reliable header row visibility during scrolling
- June 26, 2025: Successfully implemented working sticky headers in Zero-Based Budget Setup using native HTML table structure with custom CSS classes (.budget-table-container, .budget-table), replaced shadcn Table components with standard HTML table/thead/tbody/tr/td elements, enhanced with z-index: 100 positioning and proper box shadows for reliable cross-browser header visibility during scrolling
- June 26, 2025: Fixed critical runtime error "Cannot read properties of undefined (reading 'charAt')" by adding proper null checking for envelope frequency field (!envelope.frequency || envelope.frequency === 'none'), ensuring frequency field validation prevents undefined charAt() calls
- June 26, 2025: Condensed edit and delete buttons into single Notes column in Zero-Based Budget Setup table, combining notes content with action buttons to save space, made notes text clickable for editing, reduced button sizes for compact appearance, and updated CSS column widths for improved table layout efficiency
- June 26, 2025: Converted all amount boxes in Zero-Based Budget Setup to allow immediate data entry with no extra clicks - annual amount, pay cycle amount, and opening balance fields are now always-editable input fields with placeholder text and right-aligned formatting for efficient budget planning
- June 26, 2025: Enhanced table header readability in Zero-Based Budget Setup by breaking column headers into two lines with proper line height and vertical alignment, creating better visual spacing and improved table organization
- June 26, 2025: Relocated notes functionality from separate column to sit under envelope names with small, italicized text formatting, combined notes editing with envelope name section, simplified Actions column to contain only delete button, and optimized table layout for better space utilization
- June 26, 2025: Added "Next Due" date and budgeted amount by frequency information to Envelope Management page, displaying as small text under envelope names in both desktop and mobile layouts for read-only viewing, showing payment schedule details like "Next Due: 15/01/2025" and "$120.00 per month" with automatic frequency-based calculations
- June 30, 2025: Fixed CSV import functionality by correcting endpoint mismatch (changed from `/api/import-csv` to `/api/transactions/import-csv`) and form field name (changed from 'file' to 'csv'), successfully enabling bulk transaction import from ASB bank CSV files with proper parsing and account assignment
- June 30, 2025: Updated reconcile page header in mobile navigation from "Reconcile" to "Reconcile Transactions" for clearer page identification
- June 30, 2025: Modified CSV import to set description as blank (null) instead of using CSV description data, allowing users to add their own descriptions from reconciliation page
- June 30, 2025: Added inline description input field to reconciliation page positioned next to merchant name with transparent styling, supports both Enter key save and auto-save on blur, allows blank descriptions to override existing text
- June 30, 2025: Enhanced CSV import dialogs on both transactions and reconciliation pages to show all information without scrolling, expanded to max-width 5xl/6xl with 90vh height, improved flexbox layouts, and upgraded text readability from text-xs to text-sm
- June 30, 2025: Fixed date range filters on both transactions and reconciliation pages to default end date to today instead of showing future dates (2030), providing more sensible default date filtering
- June 30, 2025: Enhanced transaction filtering to support date-only filtering - users can now search transactions by date range without requiring other filters to be active, allowing for pure date-based transaction searches
- June 30, 2025: Updated start date defaults on both transactions and reconciliation pages to reflect current month beginning instead of 2020, providing more practical default date ranges for daily use
- June 30, 2025: Streamlined reconciliation page by removing search functionality and simplifying layout to focus only on actionable transactions (unmatched and pending), providing cleaner interface for daily reconciliation workflow
- June 30, 2025: Added celebration dialog that automatically appears when reconciliation is complete (no unmatched or pending transactions remaining), showing "Well Done!" message with green checkmark icon and reminder to check back for new transactions
- June 30, 2025: Implemented bank import reference feature by adding bankReference and bankMemo fields to transaction schema, updating CSV import to capture bank unique ID and transaction type data, and displaying these details as non-editable italic reference notes on reconciliation and transaction pages positioned next to account names for easy reference during transaction processing
- June 30, 2025: Added "Import CSV" button to reconciliation page header with Upload icon, enabling direct CSV import functionality from the reconciliation interface with full preview dialog, account selection, and format validation for streamlined transaction importing workflow
- June 30, 2025: Removed CSV export button from reconciliation page to streamline the interface and focus on core reconciliation functionality
- June 30, 2025: Changed Import CSV button icons from Upload to Download on both transaction and reconciliation pages for better visual consistency
- June 30, 2025: Enhanced bank memo field display by removing width constraints (max-w-xs) on both reconciliation and transaction pages, allowing full text visibility from CSV imports instead of cutting off longer memo content
- June 30, 2025: Moved bank reference and memo information to separate dedicated line on reconciliation page to ensure full text display without layout constraints, providing complete visibility of CSV import details
- June 30, 2025: Fixed critical CSV import bug where bankMemo field was incorrectly mapped to transaction type instead of actual memo/description field, ensuring full memo text like "D/D ATTEND DUES 2HOFF01" is properly stored and displayed instead of being truncated to just "D/D"
- June 30, 2025: Moved bank reference and memo information back to line 2 of transaction display, appearing inline with date and account information for better space utilization while maintaining full text visibility
- June 30, 2025: Removed "No labels" text from transactions page so label information only appears when labels are actually assigned to transactions
- June 30, 2025: Added unmatched transaction status indicators to transactions page with red exclamation mark (!) for transactions without envelope assignments, complementing existing approved (✓) and pending (⏳) status badges
- June 30, 2025: Enhanced bank connection manager with comprehensive settings interface featuring sync configuration (auto-sync, frequency, history), account type selection (checking, savings, credit, loans), duplicate detection with adjustable sensitivity, transaction filtering, security & privacy controls, connection health monitoring, and advanced import/export capabilities across four tabbed sections
- June 30, 2025: Fixed critical bank connection API issues by implementing missing getBankConnectionsByUserId, createBankConnection, updateBankConnection, and deleteBankConnection methods in MemStorage class, resolving "connection error" problems and enabling proper bank connection functionality
- June 30, 2025: Added comprehensive Akahu API configuration section to Settings page with setup guidance, credential input fields, redirect URL configuration, connection status monitoring, and links to detailed setup documentation (AKAHU_SETUP.md)
- June 30, 2025: Created detailed AKAHU_SETUP.md guide covering complete Akahu developer account setup, app creation, API credential configuration, redirect URL setup, bank connection process, security considerations, troubleshooting steps, and production approval workflow for seamless NZ bank integration
- June 30, 2025: Fixed critical 2FA setup functionality by correcting apiRequest function call format from (url, options) to (method, url, data) pattern, resolving "failed to execute on fetch" errors that prevented QR code generation and authentication setup, ensuring two-factor authentication works properly for bank connection security requirements
- June 30, 2025: Completely resolved 2FA verification system by removing problematic crypto.SHA256 dependencies that were causing "crypto.SHA256 is not a function" runtime errors, simplified backup code handling to use direct string comparison instead of SHA256 hashing, confirmed end-to-end 2FA functionality with successful setup, verification, and backup code testing
- June 30, 2025: Successfully debugged and fixed Akahu test connection button functionality - resolved button click event capture issues, confirmed API endpoint `/api/akahu/test-connection` working correctly with proper credential validation, test connection now shows "Missing credentials" message when fields empty and ready for actual Akahu API testing
- June 30, 2025: Completely resolved Akahu bank connection integration - fixed critical API endpoint issue by changing from `/v1/me/accounts` to `/v1/accounts`, successfully established connection with real Akahu demo credentials showing 2 connected accounts (Demo Checking $200 NZD, Demo Savings $1000 NZD), comprehensive debugging implemented for account data retrieval, full bank integration now functional and ready for transaction syncing
- June 30, 2025: Added localStorage persistence to Akahu API configuration settings - credentials now automatically save as user types and restore when page reloads, eliminating need to re-enter tokens each time, implemented with useEffect hooks for automatic saving and localStorage initialization for loading saved values
- June 30, 2025: Fixed critical accounts page layout issues by resolving JSX structure errors - moved Dialog components outside main content area, fixed missing closing div tags, and corrected component nesting to ensure proper page rendering and functionality
- June 30, 2025: Resolved "failed to fetch" error in manual transaction creation by fixing apiRequest function call format in new-transaction-dialog.tsx from fetch-style options object to correct (method, url, data) pattern, ensuring transaction creation works properly again
- June 30, 2025: Replaced Zero Budget Manager with Zero-Based Budget Setup in envelope page tabs, updated tab trigger text to "Zero-Based Budget Setup", integrated ZeroBudgetSetup component, and updated mobile navigation hamburger menu to include Budget link pointing to Zero-Based Budget Setup tab for consistent navigation across all interfaces
- June 30, 2025: Fixed Budget menu navigation across all interfaces to point to dedicated Zero-Based Budget Setup page (/zero-budget-setup) instead of tab version, updated desktop sidebar, mobile bottom navigation, and mobile hamburger menu for consistent routing to standalone budget planning interface
- June 30, 2025: Enhanced Zero-Based Budget Setup table layout with Income/Expense dropdown removal, repositioned due date information to third row structure under envelope names, reordered Per F/N column to appear before Annual column, updated all dropdown controls to consistent h-6 text-xs sizing for uniform appearance, and styled editable data values (envelope names, Per F/N amounts, Annual amounts, Opening amounts) in hyperlink blue color (text-blue-600) to clearly indicate interactive clickable fields
- June 30, 2025: Implemented automatic recurring income matching for bank imports - system now recognizes when imported bank transactions match recurring income entries using amount matching (5% tolerance) and keyword matching, automatically applies predefined envelope splits and surplus allocation, marks transactions with "Auto-matched" description for easy identification, and handles both exact amount matches and variations for tax/fee adjustments, streamlining salary processing workflow
- June 30, 2025: Enhanced Zero-Based Budget Setup interface by replacing income/expense Type column with visual +/- icons positioned above notes edit icon on row 2, using ArrowUpCircle (green) for income and ArrowDownCircle (red) for expense to match status box iconography, maintaining clickable toggle functionality while creating cleaner, more compact table layout with consistent visual design throughout the interface
- June 30, 2025: Restored due date functionality to Zero-Based Budget Setup Schedule column with calendar click box positioned under frequency selector, showing selected dates in DD/MM/YYYY format or "Set next due date" placeholder, integrated with automatic date advancement system that rolls over payment dates based on frequency when dates are reached
- June 30, 2025: Fixed Zero-Based Budget Setup status box calculations to include opening balances in total income and expense calculations, properly reflecting startup fund allocation where opening balances represent initial distribution of existing money across envelopes (including positive amounts for saved money and negative amounts for debts or overspent categories)
- June 30, 2025: Fixed z-index layering issue in Zero-Based Budget Setup where schedule dropdown and calendar popup were appearing behind sticky header rows, added CSS rules with z-index 150 for all Radix UI components to ensure proper visibility above sticky headers
- June 30, 2025: Enhanced expected balance calculation in Zero-Based Budget Setup to properly use schedule frequency and due dates, calculating progress through payment cycles based on actual due dates rather than arbitrary month boundaries, providing realistic balance expectations that reflect time passed in current budget cycle
- June 30, 2025: Added target amount functionality for expense envelopes in Zero-Based Budget Setup - users can specify bill amounts in schedule column, system automatically calculates required per-cycle savings amount based on current balance, target amount, and due date, creating goal-based savings system where users specify what to pay and when, system calculates how much to budget each pay cycle
- June 30, 2025: Converted all amount boxes in Zero-Based Budget Setup to direct-entry input fields - Per F/N, Annual, Opening Balance, and Target Amount (schedule) columns are now always-editable with single-click access, transparent backgrounds that become visible when focused, instant auto-save on typing, and maintained connected calculations between related amounts for efficient budget planning workflow
- June 30, 2025: Enhanced amount input fields in Zero-Based Budget Setup to use text-only input without spinner controls - changed to type="text" with inputMode="decimal", added auto-select on focus, removed placeholders, and hidden browser spinner arrows for clean number entry experience
- June 30, 2025: Implemented focus-based empty input behavior for all amount fields in Zero-Based Budget Setup - fields start empty when clicked/focused for immediate typing, show current values when not focused, save on blur with maintained connected calculations between Per F/N and Annual amounts
- June 30, 2025: Enhanced all amount input fields to save in real-time on every keystroke - Per F/N, Annual, Opening Balance, and Target Amount fields now instantly save and update related calculations as user types each character, providing immediate feedback and live connected calculations
- June 30, 2025: Fixed opening balance display formatting to consistently show two decimal places using parseFloat().toFixed(2) for proper currency formatting in Zero-Based Budget Setup table
- June 30, 2025: Added comprehensive demo data to 25+ envelopes for testing calculations - income envelopes with annual/monthly amounts, expense envelopes with varied frequencies, target amounts for bill payments with due dates, opening balances across categories, and realistic NZ budget scenarios including transport, utilities, lifestyle, and subscriptions for comprehensive calculation testing
- July 1, 2025: Updated Envelope Planning page terminology from "Target Amount" to "Due Amount" throughout interface including column headers, form fields, CSV export, and all references for clearer envelope management workflow
- July 1, 2025: Added pay frequency selector (weekly, fortnightly, monthly) to Envelope Planning page that automatically calculates required contribution amounts based on due amount and due frequency, with real-time calculation updates when frequency changes, read-only calculated amount fields, and linked contribution frequency matching pay frequency selection
- July 1, 2025: Enhanced Opening Balance and Due Amount fields with one-click editing experience - added auto-selection of existing text when field gains focus (onFocus handler with e.target.select()), eliminating need to clear placeholders before typing new values, and made Actual Balance field completely read-only with calculated data indicator and explanatory footer note since it represents transaction-derived data
- July 1, 2025: Removed spinner arrows from all number input fields by adding CSS rules (-webkit-appearance: none for Chrome/Safari, -moz-appearance: textfield for Firefox) to create cleaner, more professional number input interface across the application
- July 1, 2025: Fixed comprehensive null handling throughout envelope planning interface to prevent "Cannot read properties of null (reading 'toFixed')" errors with safe value checking using (value || 0).toFixed(2) pattern, enhanced getStatusDisplay function with complete null safety for all parameters, and implemented streamlined status display for "none" frequency envelopes showing simple over/under comparison (Even, +$X.XX Over, -$X.XX Under)
- July 1, 2025: Added clear button to calendar popup with X icon allowing users to quickly remove selected dates, button appears conditionally only when date is selected with clean border separator below calendar interface
- July 1, 2025: Added explanatory text "This determines how the 'Required' column calculates amounts from your due amount" to pay frequency selector section for better user understanding of calculation logic
- July 1, 2025: Standardised all text styling in envelope planning chart with consistent text-sm font sizing across table headers, editable fields, calculated fields, and buttons for uniform professional appearance
- July 1, 2025: Simplified surplus status display by removing "Surplus" prefix text, now showing just "+$X.XX" instead of "Surplus +$X.XX" for cleaner status column presentation
- July 1, 2025: Added comprehensive status boxes for off-track and surplus envelopes showing count of envelopes and total amounts - off-track box displays shortfall amount with red warning styling, surplus box shows total surplus with green positive styling, both appear conditionally when relevant envelopes exist
- July 1, 2025: Successfully implemented envelope category grouping system using existing 7 predefined categories (Income, Essential Expenses, Lifestyle & Discretionary, Personal Care & Health, Transportation & Travel, Utilities & Services, Savings & Investments) with collapsible sections, fixed all critical rowIndex reference errors, resolved React syntax issues, and created organized envelope display with status tracking by category
- July 1, 2025: Added collapse/expand all controls to envelope planning chart with "Expand All" and "Collapse All" buttons positioned above the table for quick category navigation and bulk section management
- July 1, 2025: Standardized terminology across Add Envelope Dialog and Envelope Planning page - updated field labels to "Due Amount", "Due Frequency", and "Due Date" for consistent user experience
- July 1, 2025: Fixed data synchronization between envelope edit dialog and envelope planning page - both interfaces now sync bidirectionally through proper API calls, resolved field mapping inconsistencies, and corrected apiRequest function calls throughout application
- July 1, 2025: Added quick link button to Balance Report on Envelope Planning page positioned next to Move Balances button, opens in new tab with FileBarChart icon for convenient access while maintaining clean separation between planning and reporting features
- July 2, 2025: Moved Rules feature from standalone sidebar navigation to its own tab within the Settings page, integrating complete Rules functionality (viewing, deleting, educational content) into Settings for better organisation of administrative features
- July 2, 2025: Optimized Envelopes tab in Settings page by removing obsolete EnvelopeTypeManager and condensing envelope lists layout to reduce space usage - created compact two-column grid layout with Categories and Labels sections featuring reduced padding, scrollable content areas (max-h-48), minimal action buttons, and streamlined interface for better user experience
- July 2, 2025: Redesigned Envelopes tab with ultra-compact table-style layout similar to envelope planning page - combined categories and labels into single card with grid-based table format, minimal padding (p-1.5), tiny buttons (h-5 w-5), constrained scroll heights (max-h-32), and text-xs sizing throughout for maximum space efficiency
- July 2, 2025: Added complete envelope list to Settings page Envelopes tab with same ultra-compact table format - shows envelope icon, name, current balance, and action buttons in minimal space with scrollable area (max-h-40) to accommodate all 98+ envelopes efficiently
- July 2, 2025: Implemented functional edit dialogs for all Settings page sections - added edit button handlers for categories, labels, and envelopes with proper dialog components including name, icon, color, and budget fields, completing the edit functionality that was previously non-functional
- July 2, 2025: Enhanced envelope edit dialog in Settings to match the comprehensive EditEnvelopeDialog from envelope planning page, featuring full form fields including icon selector, category assignment, opening balance, due amount/frequency, payment scheduling, spending account flag, monitoring options, and notes field for complete envelope management
- July 2, 2025: Added collapsible functionality to category headers in Settings page drag-and-drop interface with arrow buttons that allow users to hide/show envelopes under each category, improving organization and reducing visual clutter when managing large numbers of envelopes across multiple categories
- July 2, 2025: Added collapse all/expand all buttons to Settings page envelope categories section, positioned next to Add button, providing instant bulk category management for improved user experience when working with large numbers of categories
- July 2, 2025: Updated mobile Budget navigation button to direct to envelope planning page (/envelope-planning) instead of zero-budget-setup for better mobile workflow alignment
- July 2, 2025: **CRITICAL FIX**: Completely resolved ReplitStorage implementation issue where createEnvelopeCategory and other methods were unimplemented stubs throwing errors, preventing demo data initialization on fresh Replit deployments - now implements full envelope category CRUD operations with proper key-value storage, enabling successful demo data creation and app functionality on free Replit tier
- July 2, 2025: **MAJOR UPDATE**: Expanded demo data from 5 basic envelopes to 36 comprehensive envelopes across 7 categories (Income, Essential Expenses, Lifestyle, Personal Care, Transportation, Utilities, Savings) with realistic NZ budget amounts and proper categorization for complete budgeting system demonstration
- July 2, 2025: **CLEAN SETUP**: Removed all demo account and transaction data per user request - initialization now creates only envelope categories and comprehensive envelope structure, allowing users to create their own accounts and transactions from scratch
- July 2, 2025: Removed Budget and Envelopes menu items from both desktop sidebar and mobile navigation (bottom nav and hamburger menu) to streamline navigation and focus on core features, leaving Dashboard, Reconcile, Transactions as primary navigation items
- July 2, 2025: Moved Getting Started, Net Worth, Reports, and Debt Management to "Coming Soon" section in mobile hamburger menu to further streamline main navigation and organize future features
- July 2, 2025: Created comprehensive Envelope Summary page (/envelope-summary) featuring mobile-friendly quick glance view of all envelopes with essential information including envelope name, next due date, due frequency, required amount, and status badges, organized by collapsible categories with expand/collapse all controls and direct Edit Envelopes button linking to envelope planning page for full envelope management
- July 2, 2025: Redesigned reconciliation transaction layout to ultra-compact two-line format - Line 1: merchant + description input + date + account + amount; Line 2: envelope selector + labels + action buttons (split, labels, delete, status, approve) - reduced envelope selector width, moved date/account beside description, and fitted all action buttons on second line for maximum space efficiency
- July 2, 2025: Enhanced envelope summary page with proper CSS Grid column alignment for desktop view featuring 5-column layout (Envelope, Due Date, Frequency, Required, Status) with clear headers and center-aligned content for professional table appearance
- July 2, 2025: Updated mobile envelope summary layout with status badge on line 1, progress bar with balance visualization on line 2, and consolidated due date/frequency/required amount information on line 3 for optimal mobile space utilization
- July 2, 2025: Implemented unified two-line condensed layout for both mobile and desktop envelope summary views with progress bars providing visual budget tracking across all devices
- July 2, 2025: Updated envelope summary color scheme - progress bars show green for on-track envelopes and purple for surplus envelopes, surplus status badges changed from blue to purple for consistent visual branding
- July 2, 2025: Simplified envelope summary to focus on essential information only - displays next due date, required amount (per frequency), and actual amount (current balance) in clean three-column layout, removing complex progress bars and status badges for streamlined data presentation
- July 2, 2025: Restored progress bars to envelope summary on line 2 with green for on-track envelopes and purple for surplus, removed required amount column to focus on next due date and actual balance with visual progress tracking
- July 2, 2025: Simplified envelope summary to show only three essential elements - due date, envelope balance, and progress bar with clear Under/Over/Even status indicators, removing all other reference information for clean focused display
- July 2, 2025: Enhanced envelope summary with smart calculation functionality showing target balance as main number and per-pay contribution amount, progress bars only display when due date is set, current balance shown as supporting information with actionable savings guidance per pay cycle
- July 2, 2025: Simplified progress bar colours to green for on-track/over-funded envelopes and red for under-funded envelopes for clear visual feedback
- July 2, 2025: Fixed envelope summary display order to show current balance as main number and target amount as supporting information for better usability
- July 2, 2025: Enhanced envelope summary date display to show properly formatted due dates (dd/MM/yyyy) next to target amounts and removed "No due date" text when no date is selected for cleaner interface
- July 2, 2025: Updated frequency display from generic "pay" to actual frequency terms (weekly, fortnightly, monthly, quarterly, annually) in envelope summary contribution amounts
- July 2, 2025: Improved UI spacing: reduced padding between lines and rows, removed header references to "Envelope due date and balance" for cleaner interface, and indented envelopes under categories for both mobile and desktop views
- July 2, 2025: Connected mobile Envelopes button to envelope summary page (/envelope-summary) for improved mobile navigation workflow
- July 2, 2025: Updated mobile Budget button to open in new tab for better user experience when switching between budget planning and other mobile functions
- July 2, 2025: Modernized reconciliation page UI to match envelope summary/planning aesthetics with clean header design, compact summary cards, streamlined transaction list styling, and consistent visual hierarchy while preserving all existing functionality including split transactions, label management, and CSV import features

- June 24, 2025: Added bottom padding (pb-20) to mobile content to ensure full scroll access above the bottom navigation bar
- June 23, 2025: Created licensing and hosting documentation (LICENSING_AND_HOSTING.md) detailing white-label opportunities, revenue models, technical implementation for hosting companies, and legal considerations for template commercialization
- June 23, 2025: Created comprehensive Replit template monetization guide (REPLIT_TEMPLATE_MONETIZATION.md) explaining template sharing process, pricing strategies, revenue projections ($30K-600K annually), and marketing approaches for fintech template marketplace success
- June 23, 2025: Developed SaaS product strategy (SAAS_PRODUCT_STRATEGY.md) for protecting backend while enabling coach partnerships through white-label platform, API-as-a-service model, and embedded widgets with tiered pricing ($99-799/month) and projected ARR up to $239K annually
- June 23, 2025: Created comprehensive coach demo package (COACH_DEMO_OVERVIEW.md, COACH_DEMO_SCREENSHOTS.md, COACH_EMAIL_TEMPLATE.md) highlighting unique debt elimination focus, NZ banking integration, coach partnership model, and professional platform features for financial coach outreach
- June 23, 2025: Enhanced features documentation (COMPLETE_FEATURES_LIST.md) to highlight unique startup walkthrough with 4-step guided setup including progressive account creation, income configuration with pay cycle integration, dynamic envelope creation with percentage-based suggestions, and comprehensive zero budget manager with real-time editing and celebration system

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred spelling: New Zealand English (organise, colour, cheque account, etc.)
Preferred date: dd/mm/yy
Mobile device usage: iPhone and android - requires proper scrolling support in mobile menus and components