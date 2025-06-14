'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Location Analyzer Error:', error);
  }, [error]);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              There was an error loading the Location Analyzer. This might be due to:
            </p>
            <ul className="text-sm text-gray-500 space-y-1 ml-4">
              <li>• Session authentication issues</li>
              <li>• Browser cache problems</li>
              <li>• Temporary server issues</li>
            </ul>
            <div className="flex gap-3">
              <Button onClick={reset} className="bg-orange-500 hover:bg-orange-600">
                Try again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                Back to Dashboard
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-sm font-medium cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
