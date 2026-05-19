type SupabaseLikeError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
  status?: number;
  name?: string;
};

export function logSupabaseError(context: string, error: SupabaseLikeError) {
  console.error(`[Supabase] ${context}`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    status: error.status,
    name: error.name,
  });
}
