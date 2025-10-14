import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  CreditCard,
  PiggyBank,
  BarChart3
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <PiggyBank className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Budget Mate</h1>
          </div>
          <Button asChild>
            <a href="/api/login">Login with Replit</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Personal Finance Made Simple
          </Badge>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Take Control of Your Money with 
            <span className="text-blue-600"> Envelope Budgeting</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect your New Zealand bank accounts, automate transaction categorisation, 
            and achieve your financial goals with our comprehensive budgeting platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/api/login">Get Started Free</a>
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CreditCard className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Bank Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Connect all major NZ banks securely with Akahu API integration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Target className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Envelope Budgeting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Allocate money to spending categories and track your progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Smart Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Track spending patterns and optimize your financial health
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle className="text-lg">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Bank-grade security with 2FA and encrypted data storage
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Benefits */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-3xl font-bold text-center mb-8">Why Choose My Budget Mate?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Zero-Based Budgeting</h4>
              <p className="text-gray-600">
                Every dollar has a purpose. Plan your income allocation and achieve financial balance.
              </p>
            </div>
            <div className="text-center">
              <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Mobile Optimised</h4>
              <p className="text-gray-600">
                Manage your budget on the go with our responsive mobile interface.
              </p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Real-Time Insights</h4>
              <p className="text-gray-600">
                See your financial health at a glance with comprehensive reporting.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Finances?</h3>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who've taken control of their money
          </p>
          <Button size="lg" asChild>
            <a href="/api/login">Start Your Journey Today</a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 My Budget Mate. Built with ❤️ in New Zealand.</p>
        </div>
      </footer>
    </div>
  );
}