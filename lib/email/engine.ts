/**
 * Simple Template Engine für Email-Platzhalter
 * Unterstützt: {{variable}}, {{#if condition}}...{{/if}}
 */

export type TemplateVars = Record<string, string | number | boolean | null | undefined>

export function renderTemplate(template: string, vars: TemplateVars): string {
  let result = template

  // Replace simple variables: {{name}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key]
    return value !== null && value !== undefined ? String(value) : ""
  })

  // Handle conditionals: {{#if key}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    const value = vars[key]
    return value ? content : ""
  })

  return result
}
