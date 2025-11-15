"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Settings,
  Shield,
  Calendar,
  Download,
  Upload,
  CreditCard,
  Banknote,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { TwoFactorAuthSetup } from "@/components/auth/two-factor-auth-setup";

interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  status: "connected" | "disconnected" | "action_required" | "issues";
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BankConnectionManagerProps {
  className?: string;
  userId: string;
  username: string;
}

export default function BankConnectionManager({
  className,
  userId,
  username,
}: BankConnectionManagerProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<BankConnection | null>(null);
  const [show2FAValidation, setShow2FAValidation] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncFrequency: "daily",
    includeAccountTypes: ["checking", "savings"],
    syncHistoryDays: 90,
    duplicateThreshold: 0.9,
  });
  const queryClient = useQueryClient();

  // Fetch bank connections
  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const response = await fetch("/api/bank-connections");
      if (!response.ok) {
        throw new Error("Failed to fetch bank connections");
      }
      return response.json();
    },
  });

  // Check 2FA status (TODO: implement API endpoint)
  const { data: twoFactorStatus } = useQuery({
    queryKey: ["2fa-status", userId],
    queryFn: async () => {
      // TODO: Implement /api/2fa/status endpoint
      return { twoFactorEnabled: false, backupCodesCount: 0 };
    },
  });

  // Connect to Akahu OAuth
  const handleConnectBank = () => {
    // In production, redirect to Akahu OAuth flow
    const akahuAuthUrl = process.env.NEXT_PUBLIC_AKAHU_AUTH_URL;
    if (!akahuAuthUrl) {
      toast.error(
        "Akahu configuration missing. Check NEXT_PUBLIC_AKAHU_AUTH_URL environment variable."
      );
      return;
    }

    // Check if 2FA is enabled (optional for now)
    if (twoFactorStatus?.twoFactorEnabled) {
      setShow2FAValidation(true);
    } else {
      // Proceed directly to Akahu OAuth
      window.location.href = akahuAuthUrl;
    }
  };

  // Validate 2FA before connecting
  const handleValidate2FA = async () => {
    // TODO: Implement 2FA validation
    toast.info("2FA validation not yet implemented. Proceeding to Akahu...");
    const akahuAuthUrl = process.env.NEXT_PUBLIC_AKAHU_AUTH_URL;
    if (akahuAuthUrl) {
      window.location.href = akahuAuthUrl;
    }
    setShow2FAValidation(false);
    setTwoFactorToken("");
  };

  // Disconnect bank mutation
  const disconnectBankMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/akahu/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect bank");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Bank connection disconnected successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to disconnect bank: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    },
  });

  // Sync bank mutation
  const syncBankMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/akahu/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!response.ok) {
        throw new Error("Failed to sync bank data");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(
        `Sync completed. ${data.providers?.length || 0} provider(s) refreshed.`
      );
    },
    onError: (error) => {
      toast.error(
        `Failed to sync bank data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    },
  });

  const getConnectionStatus = (connection: BankConnection) => {
    switch (connection.status) {
      case "connected":
        return { icon: Wifi, color: "text-green-600", label: "Connected" };
      case "disconnected":
        return { icon: WifiOff, color: "text-red-600", label: "Disconnected" };
      case "action_required":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          label: "Action Required",
        };
      case "issues":
        return { icon: AlertCircle, color: "text-orange-600", label: "Issues" };
      default:
        return { icon: WifiOff, color: "text-gray-600", label: "Unknown" };
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return "Never";
    const date = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440)
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Security Notice for 2FA (Optional) */}
      {!twoFactorStatus?.twoFactorEnabled && false && (
        <Alert className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>Two-Factor Authentication Recommended:</strong> For enhanced
            security, consider enabling two-factor authentication before
            connecting bank accounts.
          </AlertDescription>
        </Alert>
      )}

      {/* Two-Factor Authentication Setup (Optional) */}
      {!twoFactorStatus?.twoFactorEnabled && false && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Two-Factor Authentication Setup
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Secure your account with two-factor authentication
            </p>
          </CardHeader>
          <CardContent>
            <TwoFactorAuthSetup userId={userId} username={username} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Bank Connections
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your bank accounts via Akahu for automatic transaction
                import
              </p>
            </div>
            <Button onClick={() => setShowConnectDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No bank accounts connected. Connect your first bank to start
                importing transactions automatically via Akahu.
              </AlertDescription>
            </Alert>
          ) : (
            connections.map((connection) => {
              const status = getConnectionStatus(connection);

              return (
                <Card key={connection.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white text-lg">
                          🏦
                        </div>
                        <div>
                          <h4 className="font-medium">{connection.provider}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <status.icon
                                className={`h-3 w-3 ${status.color}`}
                              />
                              <span>{status.label}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Last sync: {formatLastSync(connection.last_synced_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection);
                            setShowSettingsDialog(true);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Settings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncBankMutation.mutate()}
                          disabled={
                            syncBankMutation.isPending ||
                            connection.status === "disconnected"
                          }
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-1 ${syncBankMutation.isPending ? "animate-spin" : ""}`}
                          />
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectBankMutation.mutate()}
                          disabled={disconnectBankMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Connect Bank Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Bank via Akahu</DialogTitle>
            <DialogDescription>
              Securely connect your bank account through Akahu. Your login
              details are never stored by this application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Secure Connection:</strong> Uses bank-grade encryption
                and OAuth 2.0. Akahu is a licensed financial service provider in
                New Zealand.
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Setup Required:</strong> To connect real banks, you need
                Akahu API credentials. Check the AKAHU_SETUP.md guide for
                configuration instructions.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowConnectDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConnectBank}>
                Connect with Akahu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Authentication Dialog */}
      <Dialog open={show2FAValidation} onOpenChange={setShow2FAValidation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShieldAlert className="h-5 w-5 mr-2" />
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              For security, verify your identity before connecting bank accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Bank connections require two-factor authentication to protect
                your financial data.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="2fa-token">Authentication Code</Label>
              <Input
                id="2fa-token"
                type="text"
                placeholder="Enter 6-digit code"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                maxLength={6}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShow2FAValidation(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidate2FA}
                disabled={twoFactorToken.length !== 6}
              >
                Verify & Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Connection Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Bank Connection Settings
            </DialogTitle>
            <DialogDescription>
              Configure sync preferences, account filters, and security settings
              for {selectedConnection?.provider}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sync">Sync Settings</TabsTrigger>
              <TabsTrigger value="accounts">Account Selection</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Sync Settings Tab */}
            <TabsContent value="sync" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Automatic Sync</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Control when and how often transactions are imported
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-sync">Enable automatic sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically import new transactions
                      </p>
                    </div>
                    <Switch
                      id="auto-sync"
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) =>
                        setSyncSettings({ ...syncSettings, autoSync: checked })
                      }
                    />
                  </div>

                  {syncSettings.autoSync && (
                    <div className="space-y-3">
                      <div>
                        <Label>Sync frequency</Label>
                        <Select
                          value={syncSettings.syncFrequency}
                          onValueChange={(value) =>
                            setSyncSettings({
                              ...syncSettings,
                              syncFrequency: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">
                              Real-time (via webhooks)
                            </SelectItem>
                            <SelectItem value="hourly">Every hour</SelectItem>
                            <SelectItem value="daily">
                              Daily at 6 AM
                            </SelectItem>
                            <SelectItem value="weekly">
                              Weekly on Monday
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Transaction history to sync</Label>
                        <Select
                          value={syncSettings.syncHistoryDays.toString()}
                          onValueChange={(value) =>
                            setSyncSettings({
                              ...syncSettings,
                              syncHistoryDays: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                            <SelectItem value="180">Last 6 months</SelectItem>
                            <SelectItem value="365">Last 12 months</SelectItem>
                            <SelectItem value="0">
                              All available history
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Duplicate Detection</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Prevent importing duplicate transactions
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Detection sensitivity</Label>
                    <div className="mt-2">
                      <input
                        type="range"
                        min="0.7"
                        max="1.0"
                        step="0.1"
                        value={syncSettings.duplicateThreshold}
                        onChange={(e) =>
                          setSyncSettings({
                            ...syncSettings,
                            duplicateThreshold: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Relaxed (70%)</span>
                        <span>Strict (100%)</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current:{" "}
                      {Math.round(syncSettings.duplicateThreshold * 100)}% match
                      required
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Selection Tab */}
            <TabsContent value="accounts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Account Types to Sync
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose which types of accounts to import from
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      id: "checking",
                      name: "Cheque/Transaction Accounts",
                      icon: Banknote,
                      description: "Day-to-day spending accounts",
                    },
                    {
                      id: "savings",
                      name: "Savings Accounts",
                      icon: Building2,
                      description: "Interest-bearing savings accounts",
                    },
                    {
                      id: "credit",
                      name: "Credit Cards",
                      icon: CreditCard,
                      description: "Credit card transactions",
                    },
                    {
                      id: "loan",
                      name: "Loans & Mortgages",
                      icon: Building2,
                      description: "Loan payment accounts",
                    },
                  ].map((accountType) => (
                    <div
                      key={accountType.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <accountType.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">
                            {accountType.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {accountType.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={syncSettings.includeAccountTypes.includes(
                          accountType.id
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSyncSettings({
                              ...syncSettings,
                              includeAccountTypes: [
                                ...syncSettings.includeAccountTypes,
                                accountType.id,
                              ],
                            });
                          } else {
                            setSyncSettings({
                              ...syncSettings,
                              includeAccountTypes:
                                syncSettings.includeAccountTypes.filter(
                                  (t) => t !== accountType.id
                                ),
                            });
                          }
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Filters</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Filter which transactions to import
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Minimum transaction amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Skip transactions below this amount
                    </p>
                  </div>

                  <div>
                    <Label>Exclude merchant patterns</Label>
                    <Input
                      placeholder="e.g., ATM WITHDRAWAL, BANK FEE"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated patterns to exclude
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Security</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage connection permissions and access
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Secure Connection:</strong> Your banking
                      credentials are never stored. This app uses read-only
                      access through Akahu&apos;s bank-approved APIs.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Connection Status</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedConnection?.status || "Unknown"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {selectedConnection?.status === "connected"
                          ? "Connected"
                          : "Disconnected"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Last Synced</Label>
                        <p className="text-sm text-muted-foreground">
                          {formatLastSync(selectedConnection?.last_synced_at || null)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Privacy</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Control how your data is used
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Store transaction descriptions</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep original merchant descriptions
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable merchant categorisation</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically suggest envelope assignments
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import/Export</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Backup and restore connection data
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Export connection settings</Label>
                      <p className="text-sm text-muted-foreground">
                        Save current configuration
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Import settings</Label>
                      <p className="text-sm text-muted-foreground">
                        Load saved configuration
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Health</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Monitor and troubleshoot connection issues
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold text-green-600">
                        {selectedConnection?.status === "connected" ? "✓" : "✗"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connection Status
                      </div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold">
                        {selectedConnection?.last_synced_at ? "Recent" : "Never"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last Sync
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => syncBankMutation.mutate()}
                    disabled={syncBankMutation.isPending}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${syncBankMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Test Connection
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">
                    Danger Zone
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Irreversible actions
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <Label className="text-red-800">Reset all settings</Label>
                      <p className="text-sm text-red-600">
                        Restore default configuration
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700"
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <Label className="text-red-800">Delete connection</Label>
                      <p className="text-sm text-red-600">
                        Permanently remove this bank connection
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setShowSettingsDialog(false);
                        disconnectBankMutation.mutate();
                      }}
                      disabled={disconnectBankMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
            >
              Close
            </Button>
            <Button onClick={() => toast.success("Settings saved successfully")}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
