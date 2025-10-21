export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-9 w-20 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1"></div>
              <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <div className="h-10 w-full bg-muted animate-pulse rounded"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6">
                <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-4 w-48 bg-muted animate-pulse rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-10 w-full bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
