import { z } from 'npm:zod@3.23.8'

// ---------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------
export const OcrPageSchema = z.object({
  page_number: z.number().int().min(1),
  text: z.string(),
  confidence: z.number().min(0).max(1),
})

export const OcrResultSchema = z.object({
  pages: z.array(OcrPageSchema).min(1),
  overall_confidence: z.number().min(0).max(1),
})
export type OcrResult = z.infer<typeof OcrResultSchema>

// ---------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------
export const DOCUMENT_TYPES = [
  'invoice',
  'contract',
  'government_letter',
  'university_document',
  'employment_document',
  'bank_document',
  'insurance',
  'tax',
  'rental',
  'utility_bill',
  'appointment',
  'certificate',
  'receipt',
  'subscription',
  'other',
] as const

export const ClassificationResultSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  language: z.string().min(2).max(32),
  confidence: z.number().min(0).max(1),
})
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>

// ---------------------------------------------------------------------
// Structured extraction — every field is optional and confidence-scored.
// The model must omit (null) anything it cannot find; it must never invent
// values.
// ---------------------------------------------------------------------
const ExtractedField = z
  .object({
    value: z.string(),
    confidence: z.number().min(0).max(1),
  })
  .nullable()

const ExtractedList = z
  .array(
    z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  )
  .default([])

export const ExtractedDataSchema = z.object({
  document_title: ExtractedField.default(null),
  issuer: ExtractedField.default(null),
  recipient: ExtractedField.default(null),
  names: ExtractedList,
  organizations: ExtractedList,
  addresses: ExtractedList,
  document_date: ExtractedField.default(null),
  effective_date: ExtractedField.default(null),
  expiry_date: ExtractedField.default(null),
  deadline: ExtractedField.default(null),
  appointment_datetime: ExtractedField.default(null),
  payment_amount: ExtractedField.default(null),
  currency: ExtractedField.default(null),
  payment_due_date: ExtractedField.default(null),
  invoice_number: ExtractedField.default(null),
  reference_number: ExtractedField.default(null),
  contract_number: ExtractedField.default(null),
  customer_number: ExtractedField.default(null),
  phone: ExtractedField.default(null),
  email: ExtractedField.default(null),
  iban: ExtractedField.default(null),
  required_action: ExtractedField.default(null),
  priority: z.enum(['low', 'medium', 'high']).nullable().default(null),
})
export type ExtractedData = z.infer<typeof ExtractedDataSchema>

// ---------------------------------------------------------------------
// Summary — answers the 7 questions, facts kept separate from interpretation
// ---------------------------------------------------------------------
export const SummaryResultSchema = z.object({
  overview: z.string(),
  what_is_this: z.string(),
  who_sent_it: z.string(),
  what_it_means: z.string(),
  what_to_do: z.string(),
  has_deadline: z.boolean(),
  deadline_detail: z.string().nullable().default(null),
  involves_money: z.boolean(),
  money_detail: z.string().nullable().default(null),
  next_action: z.string(),
})
export type SummaryResult = z.infer<typeof SummaryResultSchema>

/** Safely parses a possibly-fenced JSON string against a Zod schema. */
export function parseJsonWithSchema<T>(raw: string, schema: z.ZodType<T>): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  const parsed = JSON.parse(cleaned)
  return schema.parse(parsed)
}
