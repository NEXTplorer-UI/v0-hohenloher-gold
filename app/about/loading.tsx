export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-16 bg-muted rounded w-2/3 mx-auto"></div>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/5"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
