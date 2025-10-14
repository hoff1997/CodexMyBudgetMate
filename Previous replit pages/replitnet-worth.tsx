import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Home as HomeIcon, Plus, Building, Car, Wallet, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DebtFreedomDashboard from "@/components/debt-freedom-dashboard";
import type { Asset, Liability, NetWorthSnapshot } from "@shared/schema";

export default function NetWorth() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showLiabilityDialog, setShowLiabilityDialog] = useState(false);

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const { data: liabilities = [] } = useQuery<Liability[]>({
    queryKey: ['/api/liabilities'],
  });

  const { data: snapshots = [] } = useQuery<NetWorthSnapshot[]>({
    queryKey: ['/api/net-worth-snapshots'],
  });

  const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.currentValue), 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + parseFloat(liability.currentBalance), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Calculate change from previous snapshot
  const previousSnapshot = snapshots[snapshots.length - 2];
  const netWorthChange = previousSnapshot ? netWorth - parseFloat(previousSnapshot.netWorth) : 0;
  const changePercentage = previousSnapshot ? ((netWorthChange / parseFloat(previousSnapshot.netWorth)) * 100).toFixed(1) : '0';

  // Asset allocation for pie chart
  const assetTypes = {
    cash: { total: 0, color: '#10b981', label: 'Cash & Savings' },
    investment: { total: 0, color: '#3b82f6', label: 'Investments' },
    property: { total: 0, color: '#f59e0b', label: 'Property' },
    vehicle: { total: 0, color: '#8b5cf6', label: 'Vehicles' },
    other: { total: 0, color: '#6b7280', label: 'Other' }
  };

  assets.forEach(asset => {
    const value = parseFloat(asset.currentValue);
    if (assetTypes[asset.assetType as keyof typeof assetTypes]) {
      assetTypes[asset.assetType as keyof typeof assetTypes].total += value;
    } else {
      assetTypes.other.total += value;
    }
  });

  const assetAllocation = Object.entries(assetTypes)
    .filter(([_, data]) => data.total > 0)
    .map(([type, data]) => ({
      name: data.label,
      value: data.total,
      percentage: ((data.total / totalAssets) * 100).toFixed(1),
      fill: data.color
    }));

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/assets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      setShowAssetDialog(false);
      toast({ title: "Asset created successfully" });
    }
  });

  const createLiabilityMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/liabilities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liabilities'] });
      setShowLiabilityDialog(false);
      toast({ title: "Liability created successfully" });
    }
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/net-worth-snapshots', {
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      netWorth: netWorth.toFixed(2)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/net-worth-snapshots'] });
      toast({ title: "Net worth snapshot created" });
    }
  });

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="h-4 w-4" />;
      case 'investment': return <TrendingUp className="h-4 w-4" />;
      case 'property': return <HomeIcon className="h-4 w-4" />;
      case 'vehicle': return <Car className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col h-screen md:ml-64">
        {isMobile && <MobileHeader />}
        
        <main className="flex-1 overflow-y-auto h-full">
          <div className="p-4 lg:p-6 space-y-6 min-h-full">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-2">Net Worth</h1>
                <p className="text-muted-foreground">Track your financial progress over time</p>
              </div>
              <Button 
                onClick={() => createSnapshotMutation.mutate()}
                disabled={createSnapshotMutation.isPending}
              >
                Take Snapshot
              </Button>
            </div>

            {/* Net Worth Summary */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${netWorth.toLocaleString()}</div>
                  <div className={`flex items-center text-sm ${netWorthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netWorthChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                    {changePercentage}% from last snapshot
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${totalAssets.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{assets.length} assets tracked</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">${totalLiabilities.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{liabilities.length} liabilities tracked</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Debt-to-Asset Ratio</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : '0'}%</div>
                  <Progress value={totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Debt Freedom Dashboard */}
            {totalLiabilities > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-red-600" />
                    Debt Freedom Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DebtFreedomDashboard />
                </CardContent>
              </Card>
            )}

            {/* Net Worth Trend */}
            {snapshots.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Net Worth Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={snapshots.map(s => ({
                      date: new Date(s.snapshotDate).toLocaleDateString(),
                      value: parseFloat(s.netWorth)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Net Worth']} />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Asset Allocation */}
            {totalAssets > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={assetAllocation}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {assetAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Value']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Allocation Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assetAllocation.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: item.fill }}
                          ></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${item.value.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assets and Liabilities */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Assets
                    </CardTitle>
                    <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Asset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Asset</DialogTitle>
                        </DialogHeader>
                        <AssetForm 
                          onSubmit={(data) => createAssetMutation.mutate(data)}
                          isLoading={createAssetMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assets.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No assets added yet</p>
                  ) : (
                    assets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getAssetIcon(asset.assetType)}
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{asset.assetType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">${parseFloat(asset.currentValue).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {assets.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span>Total Assets</span>
                        <span className="text-green-600">${totalAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                      Liabilities
                    </CardTitle>
                    <Dialog open={showLiabilityDialog} onOpenChange={setShowLiabilityDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Liability
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Liability</DialogTitle>
                        </DialogHeader>
                        <LiabilityForm 
                          onSubmit={(data) => createLiabilityMutation.mutate(data)}
                          isLoading={createLiabilityMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {liabilities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No liabilities added yet</p>
                  ) : (
                    liabilities.map((liability) => (
                      <div key={liability.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{liability.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{liability.liabilityType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">${parseFloat(liability.currentBalance).toLocaleString()}</div>
                          {liability.interestRate && (
                            <div className="text-sm text-muted-foreground">{liability.interestRate}% APR</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {liabilities.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span>Total Liabilities</span>
                        <span className="text-red-600">${totalLiabilities.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  );
}

function AssetForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    assetType: 'cash',
    currentValue: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Asset Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Savings Account, Investment Portfolio"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="assetType">Asset Type</Label>
        <Select value={formData.assetType} onValueChange={(value) => setFormData(prev => ({ ...prev, assetType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash & Savings</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="currentValue">Current Value ($)</Label>
        <Input
          id="currentValue"
          type="number"
          step="0.01"
          value={formData.currentValue}
          onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional details..."
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Asset'}
      </Button>
    </form>
  );
}

function LiabilityForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    liabilityType: 'credit_card',
    currentBalance: '',
    interestRate: '',
    minimumPayment: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Liability Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Credit Card, Mortgage"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="liabilityType">Liability Type</Label>
        <Select value={formData.liabilityType} onValueChange={(value) => setFormData(prev => ({ ...prev, liabilityType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="mortgage">Mortgage</SelectItem>
            <SelectItem value="auto_loan">Auto Loan</SelectItem>
            <SelectItem value="student_loan">Student Loan</SelectItem>
            <SelectItem value="personal_loan">Personal Loan</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="currentBalance">Current Balance ($)</Label>
        <Input
          id="currentBalance"
          type="number"
          step="0.01"
          value={formData.currentBalance}
          onChange={(e) => setFormData(prev => ({ ...prev, currentBalance: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="interestRate">Interest Rate (% APR)</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.01"
          value={formData.interestRate}
          onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
          placeholder="0.00"
        />
      </div>
      
      <div>
        <Label htmlFor="minimumPayment">Minimum Payment ($)</Label>
        <Input
          id="minimumPayment"
          type="number"
          step="0.01"
          value={formData.minimumPayment}
          onChange={(e) => setFormData(prev => ({ ...prev, minimumPayment: e.target.value }))}
          placeholder="0.00"
        />
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional details..."
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Liability'}
      </Button>
    </form>
  );
}