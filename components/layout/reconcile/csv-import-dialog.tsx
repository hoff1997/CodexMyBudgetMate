"use client";

/**
 * CSV Import Dialog
 *
 * Full wizard flow for importing bank transactions from CSV files.
 * Steps: Upload → Map Columns → Preview → Import
 */

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
} from "lucide-react";
import { ColumnMappingStep } from "@/components/csv-import/column-mapping-step";
import { PreviewStep } from "@/components/csv-import/preview-step";
import { ImportProgress } from "@/components/csv-import/import-progress";
import {
  readFileAsText,
  MAX_FILE_SIZE,
  LARGE_FILE_THRESHOLD,
  getBankPreset,
} from "@/lib/csv";
import type {
  ImportWizardStep,
  ColumnMapping,
  ColumnMappingEntry,
  CSVImportParseResponse,
  CSVImportPreviewResponse,
  CSVImportCommitResponse,
  ParsedTransaction,
} from "@/lib/csv";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  /** Available accounts for selection */
  accounts?: Array<{ id: string; name: string }>;
  /** Callback after successful import */
  onImportComplete?: () => void;
}

export function CsvImportDialog({ open, onOpenChange, accounts = [], onImportComplete }: Props) {
  // Wizard state
  const [step, setStep] = useState<ImportWizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLargeFile, setIsLargeFile] = useState(false);

  // Parsed data
  const [parseResponse, setParseResponse] = useState<CSVImportParseResponse["data"] | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingEntry[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  // Preview data
  const [previewResponse, setPreviewResponse] = useState<CSVImportPreviewResponse["data"] | null>(
    null
  );

  // Import result
  const [importResult, setImportResult] = useState<CSVImportCommitResponse | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setStep("upload");
    setFile(null);
    setAccountId("");
    setIsLoading(false);
    setError(null);
    setIsLargeFile(false);
    setParseResponse(null);
    setColumnMappings([]);
    setMapping(null);
    setPreviewResponse(null);
    setImportResult(null);
    setImportProgress(0);
  }, []);

  // Handle dialog close
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetWizard();
    }
    onOpenChange(value);
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File size (${Math.round(selectedFile.size / 1024 / 1024)}MB) exceeds the 5MB limit`
      );
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsLargeFile(selectedFile.size > LARGE_FILE_THRESHOLD);
  };

  // Step 1: Upload and parse CSV
  const handleUpload = async () => {
    if (!file || !accountId) {
      setError("Please select a file and account");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const csvContent = await readFileAsText(file);

      // Call parse API
      const response = await fetch("/api/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, accountId }),
      });

      const result: CSVImportParseResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to parse CSV");
      }

      // Store parsed data
      setParseResponse(result.data);
      setColumnMappings(result.data.columnMappings);
      setMapping(result.data.suggestedMapping);

      // Move to mapping step
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mapping changes
  const handleMappingChange = (newMapping: ColumnMapping, entries: ColumnMappingEntry[]) => {
    setMapping(newMapping);
    setColumnMappings(entries);
  };

  // Step 2: Preview transactions
  const handlePreview = async () => {
    if (!parseResponse || !mapping) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/csv-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parseResponse.rows,
          mapping,
          accountId,
        }),
      });

      const result: CSVImportPreviewResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to preview transactions");
      }

      setPreviewResponse(result.data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview transactions");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Commit import
  const handleImport = async (skipDuplicates: boolean, duplicatesToImport: string[]) => {
    if (!previewResponse) return;

    setStep("importing");
    setIsLoading(true);
    setError(null);
    setImportProgress(10);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch("/api/csv-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: previewResponse.transactions,
          accountId,
          skipDuplicates,
          duplicatesToImport,
        }),
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      const result: CSVImportCommitResponse = await response.json();
      setImportResult(result);
      setStep("complete");

      // Notify parent of completion
      if (result.success && onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import transactions");
      setStep("complete");
    } finally {
      setIsLoading(false);
    }
  };

  // Get detected preset name
  const detectedPresetName = parseResponse?.detectedPreset
    ? getBankPreset(parseResponse.detectedPreset)?.name ?? null
    : null;

  // Step indicators
  const steps: { key: ImportWizardStep; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "mapping", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "complete", label: "Import" },
  ];

  const currentStepIndex = steps.findIndex(
    (s) => s.key === step || (step === "importing" && s.key === "complete")
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border bg-background p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <Dialog.Title className="text-lg font-semibold text-secondary">
                  Import Transactions from CSV
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  Upload a bank statement CSV file to import transactions
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      i <= currentStepIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                      {i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {/* Error Display */}
            {error && step !== "complete" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Step Content */}
            {step === "upload" && (
              <div className="space-y-6">
                {/* Account Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Account</label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account to import into" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {accounts.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No accounts found. Please create a bank account first.
                    </p>
                  )}
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">CSV File</label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label
                      htmlFor="csv-file-input"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {file ? (
                        <>
                          <FileText className="h-12 w-12 text-primary" />
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                          {isLargeFile && (
                            <Badge variant="secondary">Large file - may take longer</Badge>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-muted-foreground" />
                          <p className="font-medium">Click to select a CSV file</p>
                          <p className="text-sm text-muted-foreground">
                            or drag and drop (max 5MB)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-secondary">Supported Banks</p>
                  <p className="text-muted-foreground">
                    ASB, ANZ, BNZ, Westpac, Kiwibank, TSB, and more NZ banks are automatically
                    detected.
                  </p>
                  <p className="font-medium text-secondary mt-3">Tips</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    <li>Export transactions from your bank's internet banking</li>
                    <li>Column headers will be auto-detected (or you can map manually)</li>
                    <li>Duplicates are automatically detected and can be skipped</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!file || !accountId || isLoading || accounts.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isLargeFile ? "Processing large file..." : "Processing..."}
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === "mapping" && parseResponse && mapping && (
              <ColumnMappingStep
                columnMappings={columnMappings}
                detectedPreset={detectedPresetName}
                dateFormat={mapping.dateFormat}
                onMappingChange={handleMappingChange}
                onNext={handlePreview}
                onBack={() => setStep("upload")}
                isLoading={isLoading}
              />
            )}

            {step === "preview" && previewResponse && (
              <PreviewStep
                previewData={previewResponse}
                onImport={handleImport}
                onBack={() => setStep("mapping")}
                isLoading={isLoading}
              />
            )}

            {(step === "importing" || step === "complete") && (
              <ImportProgress
                isImporting={step === "importing"}
                progress={importProgress}
                result={importResult}
                error={error}
                onClose={() => handleOpenChange(false)}
                onImportMore={resetWizard}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
