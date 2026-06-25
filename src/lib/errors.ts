/** Normalize Supabase / network errors for user-facing toasts */

export function formatSupabaseError(error: unknown): string {
  if (!error) return 'Something went wrong'

  if (error instanceof Error) {
    const msg = error.message

    if (msg.includes('relation') && msg.includes('does not exist')) {
      return 'Database tables are missing. Run supabase/schema.sql in your Supabase SQL Editor.'
    }
    if (msg.includes('JWT') || msg.includes('not authenticated')) {
      return 'Please sign in again.'
    }
    if (msg.includes('duplicate key') || msg.includes('profiles_username_key')) {
      return 'That username is already taken.'
    }
    if (msg.includes('row-level security')) {
      return 'Permission denied. Check Supabase RLS policies.'
    }

    return msg
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message)
  }

  return 'Something went wrong'
}
