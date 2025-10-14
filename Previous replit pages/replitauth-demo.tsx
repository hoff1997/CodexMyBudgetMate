import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Shield, Database, ExternalLink, CheckCircle } from 'lucide-react';
import { SupabaseAuthProvider, useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';

function AuthSystemDemo() {
  const { user, loading, isAuthenticated } = useSupabaseAuthContext();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            My Budget Mate Authentication
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose your preferred authentication method to access your personal budgeting application.
            Both systems provide secure access to your financial data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Replit Auth System */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  Default System
                </Badge>
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Replit Authentication</CardTitle>
              <CardDescription>
                Integrated OpenID Connect authentication through Replit platform.
                No separate account creation required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Single sign-on with Replit account</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Automatic session management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Secure token refresh</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Profile integration</span>
                </div>
              </div>
              
              <Button asChild className="w-full">
                <Link href="/api/login">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continue with Replit
                </Link>
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Uses your existing Replit account
              </p>
            </CardContent>
          </Card>

          {/* Supabase Auth System */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Alternative Option
                </Badge>
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Supabase Authentication</CardTitle>
              <CardDescription>
                Independent email-based authentication with cloud data storage.
                Create a dedicated account for this application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Email and password authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Cloud data synchronization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Email verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Data portability</span>
                </div>
              </div>

              {loading ? (
                <Button disabled className="w-full">
                  Loading...
                </Button>
              ) : isAuthenticated ? (
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Signed in as {user?.email}
                    </p>
                  </div>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/">Go to Dashboard</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full" variant="default">
                    <Link href="/signup">Create Account</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-gray-500 text-center">
                Requires email verification
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">Security & Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800">
                Both authentication systems use industry-standard security practices including HTTPS encryption,
                secure token storage, and regular security updates. Your financial data is protected with 
                bank-level security measures regardless of which authentication method you choose.
              </p>
              <div className="mt-4">
                <Link href="/privacy-policy" className="text-blue-600 hover:underline text-sm">
                  View Privacy Policy →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthDemoPage() {
  return (
    <SupabaseAuthProvider>
      <AuthSystemDemo />
    </SupabaseAuthProvider>
  );
}