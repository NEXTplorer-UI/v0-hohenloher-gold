-- Add Excel export options to report_presets table
ALTER TABLE report_presets 
ADD COLUMN IF NOT EXISTS excel_options jsonb DEFAULT '{
  "wrapText": true,
  "fontSize": 11,
  "fontFamily": "Calibri",
  "autoWidth": true,
  "headerBackground": "#e5e7eb",
  "headerBold": true,
  "alternatingRows": true,
  "preserveGrouping": true,
  "groupBackground": "#f3f4f6",
  "includeAggregations": true,
  "aggregationBackground": "#dbeafe",
  "showBorders": true,
  "borderStyle": "thin"
}'::jsonb;
