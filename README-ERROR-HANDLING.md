# Error Handling System

## Übersicht

Das Projekt verwendet ein standardisiertes Error-Handling-System mit benutzerdefinierten Error-Klassen und zentraler Fehlerbehandlung.

## Server-Side (API Routes)

### Custom Error Classes

\`\`\`typescript
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  DatabaseError 
} from '@/lib/errors/api-errors'

// Validierungsfehler
throw new ValidationError('Ungültige Eingabe', { field: 'email' })

// Authentifizierungsfehler
throw new AuthenticationError()

// Autorisierungsfehler
throw new AuthorizationError()

// Nicht gefunden
throw new NotFoundError('Produkt')

// Datenbankfehler
throw new DatabaseError('Fehler beim Speichern', error)
\`\`\`

### Error Handler Wrapper

\`\`\`typescript
import { withErrorHandling } from '@/lib/errors/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Fehler werden automatisch abgefangen und formatiert
  await requireAdmin(request)
  
  const data = await fetchData()
  return NextResponse.json(data)
})
\`\`\`

### Manuelle Fehlerbehandlung

\`\`\`typescript
import { handleAPIError } from '@/lib/errors/error-handler'

export async function POST(request: NextRequest) {
  try {
    // ... API Logic
  } catch (error) {
    return handleAPIError(error)
  }
}
\`\`\`

## Client-Side

### Fetch mit Error Handling

\`\`\`typescript
import { fetchWithErrorHandling, ClientError } from '@/lib/errors/client-errors'

try {
  const data = await fetchWithErrorHandling<Product[]>('/api/products')
  setProducts(data)
} catch (error) {
  if (error instanceof ClientError) {
    console.error(error.message, error.code)
  }
}
\`\`\`

### Error Alert Component

\`\`\`tsx
import { ErrorAlert } from '@/components/ui/error-alert'

function MyComponent() {
  const [error, setError] = useState<unknown>(null)

  return (
    <>
      {error && (
        <ErrorAlert 
          error={error} 
          title="Fehler beim Laden"
          onRetry={() => refetch()}
        />
      )}
    </>
  )
}
\`\`\`

### Error Helper Functions

\`\`\`typescript
import { 
  getErrorMessage, 
  isNetworkError, 
  isAuthError 
} from '@/lib/errors/client-errors'

const message = getErrorMessage(error)
if (isNetworkError(error)) {
  // Zeige Offline-Meldung
}
if (isAuthError(error)) {
  // Redirect zu Login
}
\`\`\`

## Error Response Format

Alle API-Fehler folgen diesem Format:

\`\`\`json
{
  "error": "Fehlermeldung",
  "code": "ERROR_CODE",
  "details": { /* optional */ },
  "timestamp": "2025-01-21T10:30:00.000Z"
}
\`\`\`

## Best Practices

1. **Verwende spezifische Error-Klassen** statt generischer Errors
2. **Nutze `withErrorHandling`** für alle neuen API-Routes
3. **Logge Fehler** mit aussagekräftigen Kontextinformationen
4. **Zeige benutzerfreundliche Meldungen** im Frontend
5. **Behandle Netzwerkfehler** separat von Validierungsfehlern
