import { getInternalServiceClient, HttpError } from './supabaseClient.ts'
export async function consumePackageUsage(ownerId: string, kind: 'pages' | 'questions', amount: number) {
  const { error } = await getInternalServiceClient().rpc('consume_package_usage', { p_owner: ownerId, p_kind: kind, p_amount: amount })
  if (error) throw new HttpError(error.message.includes('PACKAGE_LIMIT_REACHED') ? 429 : 503, error.message)
}
