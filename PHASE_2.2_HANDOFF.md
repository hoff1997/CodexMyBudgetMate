# Phase 2.2 - Transaction Dialogs Migration Handoff

**Status:** Ready to Start
**Priority:** HIGH - Core functionality for daily transaction management
**Estimated Effort:** 3-4 days (2 dialogs + API work)
**Last Updated:** 2025-11-05

---

## 🎯 Mission

Migrate two critical transaction dialog components from Replit to Next.js:
1. **Enhanced Transaction Dialog** - Full-featured transaction editing
2. **New Transaction Dialog** - Quick entry simplified form

These are essential for users to create and edit transactions with envelope assignments, receipt uploads, and transaction splitting.

---

## 📋 What Needs to Be Done

### **2.2.1 Enhanced Transaction Dialog** (Priority 1)

**Source File:** `Source Replit/src/components/enhanced-transaction-dialog.tsx` (~600+ lines)
**Destination:** `components/transactions/enhanced-transaction-dialog.tsx`

#### Features to Migrate:

**Core Transaction Fields:**
- [x] Merchant name input
- [x] Description field (separate from merchant)
- [x] Amount input with currency formatting
- [x] Date picker with validation
- [x] Account selection dropdown
- [x] Status selection (pending, approved)

**Envelope Management:**
- [x] Envelope assignment dropdown
- [x] Multi-envelope splitting interface
- [x] Split amount allocation with visual indicators
- [x] Validation: total splits must equal transaction amount
- [x] Visual feedback for over/under allocation

**Receipt Handling:**
- [x] Receipt file upload (5MB limit)
- [x] Image validation (jpg, png, pdf)
- [x] Receipt preview display
- [x] Receipt delete functionality
- [x] Supabase storage integration

**Label Management:**
- [x] Label selection multi-select
- [x] Create new label inline
- [x] Label badge display
- [x] Remove labels

**Recurring Transactions:**
- [x] "Make recurring" checkbox
- [x] Frequency selection (weekly, fortnightly, monthly, quarterly, annual)
- [x] Recurring name field
- [x] End date picker
- [x] Create recurring template + first instance

**Form Actions:**
- [x] Save button (create/update)
- [x] Delete button (edit mode only)
- [x] Cancel button
- [x] Form validation with error messages

#### Technical Patterns:

```typescript
// Form Schema (already defined in source)
const transactionSchema = z.object({
  accountId: z.number().min(1, "Account is required"),
  amount: z.string().min(1, "Amount is required"),
  merchant: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  date: z.date(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annual"]).optional(),
  recurringEndDate: z.date().optional(),
  recurringName: z.string().optional(),
  envelopes: z.array(z.object({
    envelopeId: z.number(),
    amount: z.string(),
  })).min(1, "At least one envelope is required"),
});
```

#### Migration Checklist:

**Before Starting:**
- [ ] Check if `PATCH /api/transactions/[id]` exists
- [ ] Check if receipt upload APIs exist
- [ ] Check if split transaction APIs exist
- [ ] Check if recurring transaction APIs exist
- [ ] Verify Supabase storage bucket for receipts

**Component Structure:**
- [ ] Create `components/transactions/enhanced-transaction-dialog.tsx`
- [ ] Convert from `useToast` to `sonner`
- [ ] Convert from `apiRequest` to Next.js `fetch`
- [ ] Convert form to use React Hook Form + Zod (already compatible)
- [ ] Update imports to Next.js structure

**Features by Section:**
- [ ] Basic transaction fields (merchant, amount, date, account)
- [ ] Envelope splitting interface
- [ ] Receipt upload/preview/delete
- [ ] Label management
- [ ] Recurring transaction setup
- [ ] Save/update/delete actions

**Testing:**
- [ ] Test creating new transaction
- [ ] Test editing existing transaction
- [ ] Test transaction splitting (2+ envelopes)
- [ ] Test receipt upload
- [ ] Test recurring transaction creation
- [ ] Test label assignment
- [ ] Test form validation errors

---

### **2.2.2 New Transaction Dialog** (Priority 2)

**Source File:** `Source Replit/src/components/new-transaction-dialog.tsx` (~250 lines)
**Destination:** `components/transactions/new-transaction-dialog.tsx`

#### Features to Migrate:

**Quick Entry Form:**
- [x] Merchant input with autocomplete
- [x] Merchant memory system (suggest previous envelope based on merchant)
- [x] Amount input
- [x] Date picker (defaults to today)
- [x] Account selection dropdown
- [x] Envelope selection dropdown (with smart suggestion)
- [x] Quick save button
- [x] "Advanced" button (opens Enhanced Dialog)

#### Merchant Memory Feature:

This is a key UX feature - when user types a merchant name, if they've used it before, automatically suggest the envelope they last assigned to that merchant.

```typescript
// Merchant memory query
const { data: merchantMemory = [] } = useQuery({
  queryKey: ['/api/merchant-memory'],
  // Returns: [{ merchant: "Countdown", lastEnvelopeId: 5, lastAmount: 142.50 }]
});
```

#### Migration Checklist:

- [ ] Create `components/transactions/new-transaction-dialog.tsx`
- [ ] Implement simplified form (5 fields only)
- [ ] Add merchant autocomplete with memory
- [ ] Add "Advanced" button that opens Enhanced Dialog
- [ ] Convert patterns (toast, fetch, etc.)
- [ ] Test quick entry flow
- [ ] Test merchant memory/suggestions
- [ ] Test handoff to Enhanced Dialog

---

## 🔌 API Endpoints Needed

### Existing (Verify):
- `GET /api/accounts` - List user accounts ✅ (likely exists)
- `GET /api/envelopes` - List user envelopes ✅ (likely exists)
- `GET /api/labels` - List user labels ✅ (likely exists)
- `POST /api/transactions` - Create transaction ✅ (likely exists)
- `PATCH /api/transactions/[id]` - Update transaction ⚠️ (verify)
- `DELETE /api/transactions/[id]` - Delete transaction ⚠️ (verify)

### May Need to Create:
- `POST /api/transactions/[id]/receipt` - Upload receipt
  - Supabase storage integration
  - File validation (5MB, image types)
  - Return storage URL

- `POST /api/transactions/[id]/split` - Create transaction splits
  - Validate: splits sum to transaction amount
  - Create envelope_transactions records
  - Update envelope balances

- `GET /api/merchant-memory` - Get merchant history
  - Query: SELECT merchant, envelope_id, amount FROM transactions
  - Group by merchant, return most recent envelope assignment

- `POST /api/recurring-transactions` - Create recurring transaction template
  - Store template in recurring_transactions table
  - Return template ID

- `POST /api/recurring-transaction-splits` - Create recurring splits
  - Link splits to recurring template

### API Endpoint Structure:

```typescript
// Receipt Upload
POST /api/transactions/[id]/receipt
Body: FormData with 'receipt' file
Returns: { url: string, id: string }

// Transaction Splits
POST /api/transactions/[id]/split
Body: {
  splits: [
    { envelopeId: number, amount: number },
    { envelopeId: number, amount: number }
  ]
}
Returns: { splits: [...], updatedEnvelopes: [...] }

// Merchant Memory
GET /api/merchant-memory
Returns: [
  {
    merchant: string,
    lastEnvelopeId: number,
    lastEnvelopeName: string,
    lastAmount: number,
    lastUsed: string
  }
]
```

---

## 📊 Database Schema Notes

### Tables Involved:

**transactions table:**
```sql
- id (primary key)
- user_id (foreign key)
- account_id (foreign key)
- amount (decimal)
- merchant_name (text)
- description (text, nullable)
- occurred_at (timestamp)
- status (text: 'pending', 'approved')
- receipt_url (text, nullable)
- receipt_storage_path (text, nullable)
- created_at, updated_at
```

**envelope_transactions (splits):**
```sql
- id (primary key)
- transaction_id (foreign key)
- envelope_id (foreign key)
- amount (decimal)
- created_at
```

**recurring_transactions:**
```sql
- id (primary key)
- user_id (foreign key)
- account_id (foreign key)
- name (text)
- amount (decimal)
- merchant_name (text)
- description (text, nullable)
- frequency (text)
- next_date (date)
- end_date (date, nullable)
- is_active (boolean)
- is_income (boolean)
- created_at, updated_at
```

**recurring_transaction_splits:**
```sql
- id (primary key)
- recurring_transaction_id (foreign key)
- envelope_id (foreign key)
- amount (decimal)
```

**transaction_labels (junction):**
```sql
- transaction_id (foreign key)
- label_id (foreign key)
- created_at
```

### Check if these tables exist, create migrations if needed!

---

## 🎨 UI/UX Patterns from Source

### Transaction Splitting UI:

The source uses a dynamic array of envelope splits with add/remove buttons:

```tsx
{form.watch('envelopes').map((envelope, index) => (
  <div key={index} className="flex gap-2">
    <EnvelopeSelect value={envelope.envelopeId} />
    <AmountInput value={envelope.amount} />
    <Button onClick={() => removeEnvelope(index)}>
      <Minus />
    </Button>
  </div>
))}
<Button onClick={addEnvelope}>
  <Plus /> Add Envelope
</Button>

{/* Visual validation */}
{totalSplits !== transactionAmount && (
  <Alert variant="warning">
    Splits {totalSplits > transactionAmount ? 'exceed' : 'are less than'}
    transaction amount by {Math.abs(totalSplits - transactionAmount)}
  </Alert>
)}
```

### Receipt Upload UI:

```tsx
<div className="space-y-2">
  <Label>Receipt</Label>
  <Input
    type="file"
    accept="image/*,.pdf"
    onChange={handleReceiptUpload}
  />
  {receiptPreview && (
    <div className="relative">
      <img src={receiptPreview} className="max-w-xs" />
      <Button
        onClick={deleteReceipt}
        className="absolute top-2 right-2"
      >
        Delete
      </Button>
    </div>
  )}
</div>
```

### Merchant Memory Integration:

```tsx
// When merchant field changes, suggest envelope
const merchantValue = form.watch('merchant');
const suggestedEnvelope = merchantMemory.find(
  m => m.merchant.toLowerCase().includes(merchantValue.toLowerCase())
);

useEffect(() => {
  if (suggestedEnvelope && form.watch('envelopes').length === 1) {
    form.setValue('envelopes.0.envelopeId', suggestedEnvelope.lastEnvelopeId);
  }
}, [merchantValue, suggestedEnvelope]);
```

---

## 🔄 Conversion Patterns

### 1. Toast Notifications:
```typescript
// FROM (Replit):
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Success", description: "Transaction saved" });

// TO (Next.js):
import { toast } from "sonner";
toast.success("Transaction saved");
```

### 2. API Requests:
```typescript
// FROM (Replit):
import { apiRequest } from "@/lib/queryClient";
const response = await apiRequest("POST", "/api/transactions", data);

// TO (Next.js):
const response = await fetch("/api/transactions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
if (!response.ok) throw new Error("Failed to save transaction");
const result = await response.json();
```

### 3. React Query Mutations:
```typescript
// Pattern stays similar, just update the mutationFn
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save");
    }
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    toast.success("Transaction saved");
    setOpen(false);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### 4. File Uploads:
```typescript
// Receipt upload with FormData
const handleReceiptUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("receipt", file);

  const response = await fetch(`/api/transactions/${transactionId}/receipt`, {
    method: "POST",
    body: formData, // Don't set Content-Type header for FormData
  });

  if (!response.ok) throw new Error("Upload failed");
  const { url } = await response.json();
  setReceiptUrl(url);
};
```

---

## 🧪 Testing Strategy

### Enhanced Transaction Dialog Testing:

1. **Basic Creation:**
   - Create simple transaction (1 envelope, no receipt)
   - Verify envelope balance updated
   - Verify transaction appears in list

2. **Transaction Splitting:**
   - Create transaction split across 2 envelopes (50/50)
   - Create transaction split across 3 envelopes (custom amounts)
   - Try to save with invalid split (doesn't sum to total) - should show error
   - Verify all envelope balances updated correctly

3. **Receipt Upload:**
   - Upload JPG receipt (< 5MB) - should succeed
   - Upload PDF receipt - should succeed
   - Try to upload 10MB file - should fail with size error
   - Try to upload .txt file - should fail with type error
   - Delete uploaded receipt - should remove from storage

4. **Recurring Transactions:**
   - Create recurring transaction (monthly, 6 months)
   - Verify recurring template created
   - Verify first transaction instance created
   - Check recurring splits created

5. **Labels:**
   - Assign existing label
   - Create and assign new label
   - Remove label
   - Assign multiple labels

6. **Editing:**
   - Edit existing transaction (change amount)
   - Edit splits (change envelope)
   - Verify balances recalculated correctly
   - Delete transaction
   - Verify envelope balance restored

### New Transaction Dialog Testing:

1. **Quick Entry:**
   - Create transaction with 3 fields (merchant, amount, envelope)
   - Verify defaults (today's date, first account)
   - Verify saved correctly

2. **Merchant Memory:**
   - Create transaction for "Countdown" → Groceries envelope
   - Create another transaction, type "Count" in merchant field
   - Should suggest Groceries envelope automatically
   - Accept suggestion and verify it works

3. **Advanced Handoff:**
   - Start in New Transaction Dialog
   - Click "Advanced" button
   - Verify Enhanced Dialog opens with pre-filled data
   - Complete and save from Enhanced Dialog

---

## 📁 File Structure

```
components/
  transactions/
    enhanced-transaction-dialog.tsx          (NEW - 600+ lines)
    new-transaction-dialog.tsx               (NEW - 250 lines)
    transaction-split-row.tsx                (NEW - helper component)
    receipt-upload-section.tsx               (NEW - helper component)

app/
  api/
    transactions/
      [id]/
        receipt/
          route.ts                           (NEW - receipt upload)
        split/
          route.ts                           (NEW - transaction splits)
    merchant-memory/
      route.ts                               (NEW - merchant history)
    recurring-transactions/
      route.ts                               (NEW - recurring templates)
    recurring-transaction-splits/
      route.ts                               (NEW - recurring splits)
```

---

## ⚠️ Potential Gotchas

1. **Supabase Storage:**
   - Need to create `receipts` bucket if doesn't exist
   - Set up RLS policies for receipt access
   - Generate signed URLs for receipt preview

2. **Transaction Splits:**
   - Must validate splits sum exactly to transaction amount
   - Need to handle decimal precision (use Decimal.js or similar)
   - When editing splits, need to recalculate envelope balances (restore old, apply new)

3. **Recurring Transactions:**
   - First instance creates a real transaction + recurring template
   - Need cron job/webhook to generate future instances
   - May want to disable for MVP, focus on one-time transactions first

4. **Merchant Memory:**
   - Case-insensitive matching
   - Consider fuzzy matching (e.g., "countdown" matches "Countdown Ponsonby")
   - Limit to last 50 merchants or 90 days to keep query fast

5. **File Upload Size:**
   - 5MB limit enforced client-side AND server-side
   - Consider image compression before upload
   - Show progress indicator for large uploads

---

## 🎯 Success Criteria

Phase 2.2 is complete when:

- [ ] Both dialog components migrated and working
- [ ] Can create transactions with single envelope
- [ ] Can create transactions with multiple envelopes (splits)
- [ ] Can upload and view receipts
- [ ] Can assign labels to transactions
- [ ] Merchant memory suggests correct envelope
- [ ] Form validation works and shows helpful errors
- [ ] All changes persist to database
- [ ] Envelope balances update correctly
- [ ] Both dialogs integrated into transactions page
- [ ] All tests passing

---

## 🚀 Quick Start for Next Session

1. **Read this entire handoff document**
2. **Check existing APIs:** Run `grep -r "api/transactions" app/api/` to see what exists
3. **Check existing components:** See if any transaction dialog already exists
4. **Start with New Transaction Dialog (simpler):** Get the quick-entry flow working first
5. **Then tackle Enhanced Dialog:** Build on the patterns from the simpler dialog
6. **Test incrementally:** Don't wait until everything is done to test

---

## 📊 Progress Tracking

Use TodoWrite to track:
- [ ] API endpoints verified/created
- [ ] New Transaction Dialog migrated
- [ ] Enhanced Transaction Dialog migrated
- [ ] Receipt upload working
- [ ] Transaction splitting working
- [ ] Merchant memory working
- [ ] All tests passing
- [ ] Integrated into transactions page
- [ ] Update MIGRATION_COMPLETION_CHECKLIST

---

**Good luck with Phase 2.2! 🚀**

The patterns from Phase 2.1 (Bank Connection Manager) apply here:
- Same conversion patterns (toast, fetch, React Query)
- Similar dialog structure
- Same testing approach

You've got this! 💪
