export default function PrivacyLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-6" />
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-96 mx-auto" />
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6">
                  <div className="h-6 bg-muted rounded w-48 mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
