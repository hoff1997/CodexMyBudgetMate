"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Key,
  Smartphone,
  AlertTriangle,
  Copy,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface TwoFactorAuthSetupProps {
  userId: string;
  username: string;
}

export function TwoFactorAuthSetup({
  userId,
  username,
}: TwoFactorAuthSetupProps) {
  const [setupToken, setSetupToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [regenerateToken, setRegenerateToken] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);

  // Check 2FA status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/2fa/status");
        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.isEnabled);
          setBackupCodesCount(data.backupCodesCount || 0);
          if (data.factorId) {
            setFactorId(data.factorId);
          }
        }
      } catch (error) {
        console.error("Failed to check 2FA status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    }
    checkStatus();
  }, []);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to setup 2FA");
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeDataUrl);
      setFactorId(data.factorId);
      toast.success("Scan the QR code with your authenticator app");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to setup two-factor authentication"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId) {
      toast.error("Setup not complete. Please try again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: setupToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid verification code");
      }

      const data = await response.json();
      setIsEnabled(true);
      setBackupCodes(data.backupCodes || []);
      setShowBackupCodes(true);
      setBackupCodesCount(data.backupCodes?.length || 0);
      setQrCodeUrl("");
      setSetupToken("");
      toast.success("Two-factor authentication enabled!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid verification code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!factorId) {
      toast.error("No 2FA factor found");
      return;
    }

    setIsLoading(true);
    try {
      // Create challenge and verify
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: verifyToken }),
      });

      if (response.ok) {
        toast.success("Authentication code is valid!");
        setVerifyToken("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Invalid authentication code");
      }
    } catch (error) {
      toast.error("Invalid authentication code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disable 2FA");
      }

      setIsEnabled(false);
      setFactorId(null);
      setBackupCodesCount(0);
      setDisableToken("");
      toast.success("Two-factor authentication disabled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disable two-factor authentication"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      // First verify the code, then regenerate backup codes
      const response = await fetch("/api/2fa/regenerate-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: regenerateToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate backup codes");
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes || []);
      setShowBackupCodes(true);
      setBackupCodesCount(data.backupCodes?.length || 0);
      setRegenerateToken("");
      toast.success("New backup codes generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate backup codes"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    toast.success("Backup codes copied to clipboard");
  };

  if (isCheckingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Two-Factor Authentication</CardTitle>
          {isEnabled && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Enabled
            </Badge>
          )}
        </div>
        <CardDescription>
          Add an extra layer of security to your account by requiring a
          verification code from your phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isEnabled ? "manage" : "setup"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" disabled={isEnabled}>
              Setup
            </TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            {!qrCodeUrl ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You&apos;ll need an authenticator app like Google Authenticator,
                    Authy, or 1Password to set up two-factor authentication.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSetup}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? "Setting up..." : "Setup Two-Factor Authentication"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Step 1: Scan QR Code</h3>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="2FA QR Code"
                      width={200}
                      height={200}
                      className="border rounded-lg p-4 bg-white"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Step 2: Enter Verification Code
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="setup-token">
                      6-digit code from your authenticator app
                    </Label>
                    <Input
                      id="setup-token"
                      type="text"
                      placeholder="000000"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value.replace(/\D/g, ""))}
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={isLoading || setupToken.length !== 6}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    {isLoading
                      ? "Verifying..."
                      : "Enable Two-Factor Authentication"}
                  </Button>
                </div>
              </div>
            )}

            {showBackupCodes && backupCodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Backup Codes</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Save these backup codes in a secure location. You can use
                      them to access your account if you lose your authenticator
                      device.
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-4 rounded-lg grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={copyBackupCodes}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Backup Codes
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {isEnabled ? (
              <div className="space-y-6">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is currently protecting your account.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Test Authentication
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Verify that your authenticator app is working correctly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
                        maxLength={6}
                      />
                      <Button
                        onClick={handleValidate}
                        disabled={isLoading || verifyToken.length !== 6}
                        className="w-full"
                        size="sm"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Smartphone className="h-4 w-4 mr-2" />
                        )}
                        Test Code
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Backup Codes</CardTitle>
                      <CardDescription className="text-sm">
                        {backupCodesCount > 0
                          ? `${backupCodesCount} codes remaining`
                          : "No backup codes available"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter auth code to regenerate"
                        value={regenerateToken}
                        onChange={(e) => setRegenerateToken(e.target.value.replace(/\D/g, ""))}
                        maxLength={6}
                      />
                      <Button
                        onClick={handleRegenerate}
                        disabled={isLoading || regenerateToken.length !== 6}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Generate New Codes
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-destructive">
                    Danger Zone
                  </h3>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Disabling two-factor authentication will make your account
                      less secure.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="disable-token">
                      Enter authentication code to disable 2FA
                    </Label>
                    <Input
                      id="disable-token"
                      type="text"
                      placeholder="6-digit code"
                      value={disableToken}
                      onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
                      maxLength={6}
                    />
                  </div>
                  <Button
                    onClick={handleDisable}
                    disabled={isLoading || disableToken.length !== 6}
                    variant="destructive"
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isLoading
                      ? "Disabling..."
                      : "Disable Two-Factor Authentication"}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is not currently enabled. Use the
                  Setup tab to enable it.
                </AlertDescription>
              </Alert>
            )}

            {showBackupCodes && backupCodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Your New Backup Codes</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      These codes replace your old backup codes. Save them in a
                      secure location.
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-4 rounded-lg grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyBackupCodes}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </Button>
                    <Button
                      onClick={() => setShowBackupCodes(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
