import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <Link href="/signup">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign Up
                </Button>
              </Link>
            </div>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-gray-600">Last updated: June 30, 2025</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Information We Collect</h2>
              <p className="text-gray-700 mb-3">
                We collect information you provide directly to us, such as when you create an account, 
                use our services, or contact us for support.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Account information (email address, password)</li>
                <li>Financial data you choose to input (transactions, budgets, accounts)</li>
                <li>Usage information and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">How We Use Your Information</h2>
              <p className="text-gray-700 mb-3">
                We use the information we collect to provide, maintain, and improve our services:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>To provide and operate our budgeting services</li>
                <li>To authenticate your account and ensure security</li>
                <li>To analyse usage patterns and improve our application</li>
                <li>To communicate with you about service updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate security measures to protect your personal information 
                against unauthorised access, alteration, disclosure, or destruction. Your financial 
                data is encrypted and stored securely using industry-standard practices.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Information Sharing</h2>
              <p className="text-gray-700">
                We do not sell, trade, or otherwise transfer your personal information to third 
                parties without your consent, except as described in this policy or as required 
                by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Your Rights</h2>
              <p className="text-gray-700 mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of certain communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Bank Connection Services</h2>
              <p className="text-gray-700">
                When you connect your bank accounts through our secure integration partners, 
                we only access transaction data necessary to provide our budgeting services. 
                We do not store your banking credentials and use read-only access where possible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. We will notify you of any 
                significant changes by email or through our service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this privacy policy or our data practices, 
                please contact us at privacy@mybudgetmate.com
              </p>
            </section>

            <div className="pt-6 border-t">
              <p className="text-sm text-gray-500 text-center">
                This privacy policy is designed to be transparent about our data practices. 
                Your privacy and security are important to us.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}