import { Skeleton } from "@/components/ui/skeleton"

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Next Arrival Banner Skeleton */}
      <div className="bg-primary text-primary-foreground py-3">
        <div className="container mx-auto px-4 text-center">
          <Skeleton className="h-5 w-64 mx-auto bg-primary-foreground/20" />
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <section className="py-20 bg-gradient-to-br from-card to-background">
        <div className="container mx-auto px-4 text-center space-y-6">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-16 w-96 mx-auto" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>
      </section>

      {/* Delivery Schedule Skeleton */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mx-auto mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-background border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid Skeleton */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Skeleton */}
            <div className="lg:w-1/4 space-y-4">
              <Skeleton className="h-8 w-24" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>

            {/* Products Grid Skeleton */}
            <div className="lg:w-3/4">
              <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-40" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-card border rounded-lg overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
