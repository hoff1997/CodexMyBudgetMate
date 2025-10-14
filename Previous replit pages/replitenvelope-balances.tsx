import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface Envelope {
  id: number;
  userId: number;
  name: string;
  icon: string;
  budgetAmount: string;
  currentBalance: string;
  categoryId: number | null;
  isActive: boolean;
}

interface EnvelopeCategory {
  id: number;
  name: string;
  sortOrder: number;
}

export default function EnvelopeBalances() {
  const [, setLocation] = useLocation();
  
  const { data: envelopes = [] } = useQuery<Envelope[]>({
    queryKey: ['/api/envelopes'],
  });

  const { data: categories = [] } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  // Get the last tab from URL params or localStorage
  const getLastTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromTab = urlParams.get('from');
    if (fromTab) return fromTab;
    
    // Fallback to localStorage if no URL param
    return localStorage.getItem('lastEnvelopeTab') || 'envelopes';
  };

  const handleBackClick = () => {
    const lastTab = getLastTab();
    setLocation(`/envelopes-new?tab=${lastTab}`);
  };

  // Group envelopes by category
  const groupedEnvelopes = categories.map(category => ({
    category,
    envelopes: envelopes.filter(env => env.categoryId === category.id && env.isActive)
  })).filter(group => group.envelopes.length > 0);

  // Calculate totals
  const totals = envelopes
    .filter(env => env.isActive)
    .reduce((acc, envelope) => {
      const balance = parseFloat(envelope.currentBalance);
      if (balance >= 0) {
        acc.totalCredit += balance;
      } else {
        acc.totalDebit += Math.abs(balance);
      }
      acc.netTotal += balance;
      return acc;
    }, { totalDebit: 0, totalCredit: 0, netTotal: 0 });

  const exportToExcel = () => {
    // Prepare data for CSV export
    const csvData = [];
    
    // Add header
    csvData.push(['Category', 'Envelope', 'Budget', 'Debit', 'Credit', 'Balance']);
    
    groupedEnvelopes.forEach(group => {
      group.envelopes.forEach((envelope, index) => {
        const balance = parseFloat(envelope.currentBalance);
        const debit = balance < 0 ? Math.abs(balance).toFixed(2) : '';
        const credit = balance >= 0 ? balance.toFixed(2) : '';
        
        csvData.push([
          index === 0 ? group.category.name : '', // Only show category name on first row
          envelope.name,
          parseFloat(envelope.budgetAmount).toFixed(2),
          debit,
          credit,
          balance.toFixed(2)
        ]);
      });
      
      // Add empty row between categories
      if (group !== groupedEnvelopes[groupedEnvelopes.length - 1]) {
        csvData.push(['', '', '', '', '', '']);
      }
    });
    
    // Add totals row
    csvData.push(['', 'TOTALS', '', totals.totalDebit.toFixed(2), totals.totalCredit.toFixed(2), totals.netTotal.toFixed(2)]);
    
    // Convert to CSV
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `envelope-balances-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printView = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-6 max-w-6xl print:max-w-none print:p-0 print:pb-0">
      
      {/* Back button and header */}
      <div className="mb-6 print:hidden">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            onClick={handleBackClick}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Envelope Balances</h1>
            <p className="text-muted-foreground">Complete overview of all envelope balances as at {format(new Date(), 'dd MMMM yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={printView} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={exportToExcel} variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">Envelope Balances Report</h1>
        <p className="text-center text-sm text-muted-foreground">As at {format(new Date(), 'dd MMMM yyyy')}</p>
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Balance Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Envelope</th>
                  <th className="text-right p-3 font-medium">Budget</th>
                  <th className="text-right p-3 font-medium">Debit</th>
                  <th className="text-right p-3 font-medium">Credit</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {groupedEnvelopes.map((group, groupIndex) => (
                  <>
                    {group.envelopes.map((envelope, envelopeIndex) => {
                      const balance = parseFloat(envelope.currentBalance);
                      const isOverspent = balance < 0;
                      
                      return (
                        <tr key={envelope.id} className="border-b hover:bg-muted/20">
                          <td className="p-3">
                            {envelopeIndex === 0 && (
                              <Badge variant="outline" className="text-xs">
                                {group.category.name}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{envelope.icon}</span>
                              <span className="font-medium">{envelope.name}</span>
                            </div>
                          </td>
                          <td className="text-right p-3 text-sm">
                            ${parseFloat(envelope.budgetAmount).toFixed(2)}
                          </td>
                          <td className="text-right p-3 text-sm">
                            {isOverspent && (
                              <span className="text-red-600 font-medium">
                                ${Math.abs(balance).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="text-right p-3 text-sm">
                            {!isOverspent && (
                              <span className="text-green-600 font-medium">
                                ${balance.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="text-right p-3 text-sm">
                            <span className={`font-medium ${isOverspent ? 'text-red-600' : 'text-green-600'}`}>
                              ${balance.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {groupIndex < groupedEnvelopes.length - 1 && (
                      <tr>
                        <td colSpan={6} className="p-1"></td>
                      </tr>
                    )}
                  </>
                ))}
                
                {/* Totals Row */}
                <tr className="border-t-2 border-primary bg-muted/30">
                  <td className="p-3 font-bold" colSpan={3}>TOTALS</td>
                  <td className="text-right p-3 font-bold text-red-600">
                    ${totals.totalDebit.toFixed(2)}
                  </td>
                  <td className="text-right p-3 font-bold text-green-600">
                    ${totals.totalCredit.toFixed(2)}
                  </td>
                  <td className="text-right p-3 font-bold text-lg">
                    <span className={totals.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${totals.netTotal.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-8 print:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Credit</p>
              <p className="text-2xl font-bold text-green-600">${totals.totalCredit.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Debit</p>
              <p className="text-2xl font-bold text-red-600">${totals.totalDebit.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Net Balance</p>
              <p className={`text-2xl font-bold ${totals.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totals.netTotal.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          body { 
            background: white !important;
            color: black !important;
          }
          .print\\:hidden { 
            display: none !important; 
          }
          .print\\:block { 
            display: block !important; 
          }
          .print\\:max-w-none { 
            max-width: none !important; 
          }
          table { 
            font-size: 12px !important;
          }
          .container {
            max-width: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
}