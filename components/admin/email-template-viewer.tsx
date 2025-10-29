"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EmailTemplateViewerProps {
  title: string
  description: string
  htmlContent: string
}

export function EmailTemplateViewer({ title, description, htmlContent }: EmailTemplateViewerProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent)
      setCopied(true)
      toast({
        title: "HTML kopiert!",
        description: "Die Vorlage wurde in die Zwischenablage kopiert.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Fehler",
        description: "Konnte HTML nicht kopieren.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Vorschau
            </TabsTrigger>
            <TabsTrigger value="html">HTML Code</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="border rounded-lg p-4 bg-muted/30">
            <div className="bg-white p-4 rounded" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </TabsContent>

          <TabsContent value="html" className="border rounded-lg p-4 bg-muted/30">
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              <code>{htmlContent}</code>
            </pre>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex gap-2">
          <Button onClick={copyToClipboard} className="flex-1">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                HTML kopieren
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
