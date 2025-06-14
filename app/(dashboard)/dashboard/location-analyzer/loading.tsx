import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function Loading() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <MapPin className="h-8 w-8 text-orange-500 animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analysis Button Skeleton */}
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="h-12 w-48 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
