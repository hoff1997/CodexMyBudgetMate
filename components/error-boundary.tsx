"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-gold-light rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-gold" />
            </div>
            <h2 className="text-xl font-bold text-text-dark mb-2">
              Something went wrong
            </h2>
            <p className="text-text-medium mb-6">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="bg-sage hover:bg-sage-dark gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard" className="gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error) => {
    console.error("Error:", error);
    // Could integrate with error reporting service here
  };
}
