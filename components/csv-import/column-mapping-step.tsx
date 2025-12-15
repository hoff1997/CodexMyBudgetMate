"use client";

/**
 * Column Mapping Step
 *
 * UI component for mapping CSV columns to transaction fields.
 * Shows column headers with sample values and allows manual mapping.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import {
  getAvailableFieldTypes,
  getAvailableDateFormats,
  columnMappingsToMapping,
  validateMapping,
} from "@/lib/csv";
import type {
  ColumnMappingEntry,
  MappableField,
  DateFormat,
  ColumnMapping,
} from "@/lib/csv";

interface ColumnMappingStepProps {
  /** Column mapping entries from auto-detection */
  columnMappings: ColumnMappingEntry[];
  /** Detected bank preset name (for display) */
  detectedPreset: string | null;
  /** Current date format */
  dateFormat: DateFormat;
  /** Callback when mapping changes */
  onMappingChange: (mapping: ColumnMapping, entries: ColumnMappingEntry[]) => void;
  /** Callback to proceed to next step */
  onNext: () => void;
  /** Callback to go back */
  onBack: () => void;
  /** Whether currently loading */
  isLoading: boolean;
}

export function ColumnMappingStep({
  columnMappings: initialMappings,
  detectedPreset,
  dateFormat: initialDateFormat,
  onMappingChange,
  onNext,
  onBack,
  isLoading,
}: ColumnMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMappingEntry[]>(initialMappings);
  const [dateFormat, setDateFormat] = useState<DateFormat>(initialDateFormat);

  const fieldTypes = getAvailableFieldTypes();
  const dateFormats = getAvailableDateFormats();

  // Update a single column mapping
  const handleFieldChange = (index: number, fieldType: MappableField) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], mappedTo: fieldType };
    setMappings(newMappings);

    // Convert to ColumnMapping and notify parent
    const mapping = columnMappingsToMapping(newMappings, dateFormat);
    onMappingChange(mapping, newMappings);
  };

  // Update date format
  const handleDateFormatChange = (format: DateFormat) => {
    setDateFormat(format);
    const mapping = columnMappingsToMapping(mappings, format);
    onMappingChange(mapping, mappings);
  };

  // Validate current mapping
  const mapping = columnMappingsToMapping(mappings, dateFormat);
  const validation = validateMapping(mapping);

  // Check for required fields
  const hasDate = mappings.some((m) => m.mappedTo === "date");
  const hasAmount = mappings.some((m) => m.mappedTo === "amount");
  const hasDebitCredit =
    mappings.some((m) => m.mappedTo === "debit") &&
    mappings.some((m) => m.mappedTo === "credit");
  const hasDescription = mappings.some((m) => m.mappedTo === "description");

  const canProceed = hasDate && (hasAmount || hasDebitCredit) && hasDescription;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Map Columns</h3>
          <p className="text-sm text-muted-foreground">
            Match your CSV columns to transaction fields
          </p>
        </div>
        {detectedPreset && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Detected: {detectedPreset}
          </Badge>
        )}
      </div>

      {/* Date Format Selection */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Date Format
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Select value={dateFormat} onValueChange={(v) => handleDateFormatChange(v as DateFormat)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label} ({format.example})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Column Mapping Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">CSV Column</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Sample Values</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Map To</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((entry, index) => (
                  <tr
                    key={index}
                    className={`border-b last:border-0 ${
                      entry.mappedTo !== "ignore" ? "bg-green-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{entry.header}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.sampleValues.slice(0, 3).map((value, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">
                            {value.length > 20 ? value.slice(0, 20) + "..." : value}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={entry.mappedTo}
                        onValueChange={(v) => handleFieldChange(index, v as MappableField)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant={hasDate ? "default" : "destructive"}>
            {hasDate ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
            Date
          </Badge>
          <Badge variant={hasAmount || hasDebitCredit ? "default" : "destructive"}>
            {hasAmount || hasDebitCredit ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            Amount
          </Badge>
          <Badge variant={hasDescription ? "default" : "destructive"}>
            {hasDescription ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            Description
          </Badge>
        </div>

        {!validation.valid && (
          <div className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {validation.errors.join("; ")}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed || isLoading}>
          Preview Transactions
        </Button>
      </div>
    </div>
  );
}
