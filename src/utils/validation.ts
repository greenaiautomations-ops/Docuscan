import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../types/document'

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/** Validates a file against Phase 1 upload rules (type + size). */
export function validateFile(file: File): FileValidationResult {
  const isAcceptedType = (ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type)
  if (!isAcceptedType) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP file.',
    }
  }

  if (file.size === 0) {
    return { valid: false, error: 'This file is empty.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
    }
  }

  return { valid: true }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

/** Strips characters that are unsafe in storage object paths. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}
