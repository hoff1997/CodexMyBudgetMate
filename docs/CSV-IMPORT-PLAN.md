# CSV Import Backend & Column Mapping - Planning Document

**I have reviewed the architecture docs and will follow the established patterns.**

---

## 1. Understanding of Requirements

### What Needs to Be Built
A complete CSV import system that allows users to:
1. Upload a CSV file from their bank
2. Preview the data and map columns to transaction fields
3. Select target account for the imported transactions
4. Handle duplicate detection automatically
5. Create transactions in the database with proper validation
6. Integrate with the existing transfer detection system

### Current State
- **Exists**: Basic CSV upload UI (`csv-import-dialog.tsx`) with file picker
- **Missing**:
  - Column mapping interface
  - Bank format detection/presets
  - Backend API for processing
  - Duplicate detection logic
  - Validation and error handling
  - Transfer detection integration

### User Flow (from spec)
1. Upload CSV file
2. Auto-detect or manually map columns
3. Preview transactions
4. Select target account
5. Review for duplicates
6. Import with feedback

---

## 2. Proposed File Structure

```
app/api/
├── csv-import/
│   ├── route.ts                    # POST: Process CSV, return parsed data
│   ├── preview/route.ts            # POST: Preview with mapping applied
│   └── commit/route.ts             # POST: Actually create transactions

lib/
├── csv/
│   ├── csv-parser.ts               # Core parsing logic
│   ├── column-mapper.ts            # Column mapping & detection
│   ├── bank-presets.ts             # NZ bank format definitions
│   ├── duplicate-detector.ts       # Duplicate detection algorithm
│   └── types.ts                    # TypeScript types for CSV system

components/
├── layout/reconcile/
│   └── csv-import-dialog.tsx       # UPDATE: Full wizard flow
├── csv-import/
│   ├── column-mapping-step.tsx     # Column mapping UI
│   ├── preview-step.tsx            # Preview & validation UI
│   ├── account-select-step.tsx     # Account selection
│   └── import-progress.tsx         # Progress & results display
```

---

## 3. Technical Approach

### 3.1 CSV Parsing (Client-Side)

Parse CSV on the client using a lightweight parser (no external dependencies):
- Handle various delimiters (comma, semicolon, tab)
- Detect encoding (UTF-8, Windows-1252)
- Extract headers from first row
- Return raw data for mapping step

### 3.2 Column Mapping

**Required Fields:**
| Field | Transaction Column | Required | Notes |
|-------|-------------------|----------|-------|
| Date | `occurred_at` | Yes | Parse various date formats |
| Amount | `amount` | Yes | Handle debit/credit columns or sign |
| Description | `merchant_name` | Yes | Primary description |
| Reference | `bank_reference` | No | Bank reference number |
| Memo | `bank_memo` | No | Additional notes |

**Auto-Detection Algorithm:**
1. Check for known bank preset based on column headers
2. Fall back to fuzzy matching (e.g., "Date" → date field, "Amount" → amount)
3. Allow manual override

### 3.3 NZ Bank Presets

```typescript
const NZ_BANK_PRESETS = {
  asb: {
    name: "ASB",
    dateColumn: "Date",
    amountColumn: "Amount",
    descriptionColumn: "Payee",
    referenceColumn: "Reference",
    memoColumn: "Memo",
    dateFormat: "DD/MM/YYYY",
    amountFormat: "signed", // positive = credit, negative = debit
  },
  anz: {
    name: "ANZ",
    dateColumn: "Date",
    debitColumn: "Debit Amount",
    creditColumn: "Credit Amount",
    descriptionColumn: "Details",
    referenceColumn: "Reference",
    dateFormat: "DD/MM/YYYY",
    amountFormat: "split", // separate debit/credit columns
  },
  bnz: {
    name: "BNZ",
    // ... similar structure
  },
  westpac: {
    name: "Westpac",
    // ... similar structure
  },
  kiwibank: {
    name: "Kiwibank",
    // ... similar structure
  },
};
```

### 3.4 Duplicate Detection

**Algorithm:**
1. For each parsed transaction, query existing transactions:
   - Same account
   - Same amount (exact match)
   - Within ±1 day of occurred_at
   - Similar description (fuzzy match > 80%)
2. Mark potential duplicates with confidence score
3. Allow user to skip or force import

**Query Pattern:**
```sql
SELECT id, merchant_name, amount, occurred_at
FROM transactions
WHERE user_id = $1
  AND account_id = $2
  AND amount = $3
  AND occurred_at BETWEEN $4 AND $5
```

### 3.5 Transfer Detection Integration

After import, for each transaction:
1. Call the transfer detection API (`/api/transfers`)
2. If high confidence match found, prompt user
3. If very high confidence (>90%), auto-link

### 3.6 API Design

**POST /api/csv-import**
```typescript
// Request
{
  csvContent: string,      // Raw CSV content
  accountId: string,       // Target account UUID
}

// Response
{
  success: boolean,
  data: {
    headers: string[],
    rows: string[][],
    detectedPreset: string | null,
    suggestedMapping: ColumnMapping,
    rowCount: number,
  }
}
```

**POST /api/csv-import/preview**
```typescript
// Request
{
  rows: string[][],
  mapping: ColumnMapping,
  accountId: string,
}

// Response
{
  success: boolean,
  transactions: ParsedTransaction[],
  duplicates: DuplicateMatch[],
  errors: ValidationError[],
  validCount: number,
  duplicateCount: number,
  errorCount: number,
}
```

**POST /api/csv-import/commit**
```typescript
// Request
{
  transactions: ParsedTransaction[],
  accountId: string,
  skipDuplicates: boolean,
  duplicatesToImport: string[], // IDs of duplicates to force import
}

// Response
{
  success: boolean,
  imported: number,
  skipped: number,
  errors: ImportError[],
  transactionIds: string[],
}
```

---

## 4. Edge Cases & Concerns

### 4.1 Data Quality Issues
- **Empty rows**: Skip silently
- **Missing required fields**: Show error, exclude from import
- **Invalid dates**: Try multiple formats, flag if unparseable
- **Invalid amounts**: Flag and exclude
- **Special characters in descriptions**: Sanitize but preserve

### 4.2 Large Files
- **Concern**: Browser memory for large CSVs
- **Solution**: Process in chunks, limit to 1000 rows per import
- **Future**: Server-side processing for larger files

### 4.3 Date Format Ambiguity
- `01/02/2024` could be Jan 2 or Feb 1
- **Solution**: Detect based on bank preset or ask user
- Default to DD/MM/YYYY for NZ banks

### 4.4 Amount Sign Conventions
- Some banks: negative = debit
- Some banks: positive = debit (confusing!)
- Some banks: separate columns
- **Solution**: Bank presets + user confirmation

### 4.5 Existing Transaction Conflicts
- User might import same file twice
- **Solution**: Robust duplicate detection + clear UI feedback

### 4.6 Account Selection
- Must select account before import
- What if user has no accounts?
- **Solution**: Require at least one account, show "Create Account" prompt

---

## 5. Questions & Ambiguities

### Resolved by Spec
- ✅ Date parsing should try multiple formats
- ✅ Duplicate detection should use same amount + ±1 day + same account
- ✅ Transfer detection should integrate post-import

### Questions for Clarification

1. **Maximum file size?**
   - Suggest: 5MB limit (approximately 10,000 transactions)

2. **Should we store the original CSV for audit purposes?**
   - Suggest: No, just store the transaction data

3. **Should imported transactions be auto-approved or pending?**
   - Suggest: Default to "pending" so user can review in reconciliation

4. **Should we support other file formats (OFX, QIF)?**
   - Suggest: Start with CSV only, add others later

---

## 6. Implementation Order

### Phase 1: Core Infrastructure
1. Create TypeScript types for CSV system
2. Create bank preset definitions
3. Implement CSV parser utility
4. Implement column auto-detection

### Phase 2: Backend APIs
5. Create `/api/csv-import` endpoint (parse + detect)
6. Create `/api/csv-import/preview` endpoint (validate + duplicates)
7. Create `/api/csv-import/commit` endpoint (create transactions)

### Phase 3: Duplicate Detection
8. Implement duplicate detection algorithm
9. Create duplicate matching query functions
10. Add duplicate indicator to preview response

### Phase 4: UI Components
11. Create column mapping step component
12. Create preview step component with validation display
13. Create progress/results display component
14. Update existing CSV import dialog to wizard flow

### Phase 5: Integration
15. Add transfer detection integration post-import
16. Add transaction status (pending by default)
17. Update reconciliation page to show newly imported items

### Phase 6: Polish & Testing
18. Add error handling and user feedback
19. Add loading states and progress indicators
20. Test with real bank CSV exports

---

## 7. Success Criteria

- [ ] User can upload CSV from any major NZ bank
- [ ] Column mapping is auto-detected for known banks
- [ ] User can manually adjust column mapping
- [ ] Duplicate transactions are detected and flagged
- [ ] Import creates valid transactions in database
- [ ] Imported transactions appear in reconciliation queue
- [ ] Transfer detection runs on imported transactions
- [ ] Clear error messages for invalid data
- [ ] Progress feedback during import

---

## 8. Files to Modify

### Existing Files
| File | Change |
|------|--------|
| `components/layout/reconcile/csv-import-dialog.tsx` | Complete rewrite to wizard flow |

### New Files
| File | Purpose |
|------|---------|
| `lib/csv/types.ts` | TypeScript types |
| `lib/csv/csv-parser.ts` | Parsing logic |
| `lib/csv/column-mapper.ts` | Column detection |
| `lib/csv/bank-presets.ts` | NZ bank definitions |
| `lib/csv/duplicate-detector.ts` | Duplicate logic |
| `app/api/csv-import/route.ts` | Parse API |
| `app/api/csv-import/preview/route.ts` | Preview API |
| `app/api/csv-import/commit/route.ts` | Commit API |
| `components/csv-import/column-mapping-step.tsx` | UI step |
| `components/csv-import/preview-step.tsx` | UI step |
| `components/csv-import/import-progress.tsx` | UI step |

---

## Ready for Approval

This plan covers the complete CSV import backend system with:
- Client-side CSV parsing
- Auto-detection of NZ bank formats
- Manual column mapping fallback
- Duplicate detection
- Multi-step wizard UI
- Integration with existing transfer detection

Please review and let me know if you'd like any changes before I begin implementation.
