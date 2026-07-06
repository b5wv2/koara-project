/**
 * Normalizes provider-specific statuses into Koara's internal statuses.
 * The internal statuses are strictly: pending, processing, approved, rejected, refunded.
 */
function normalizeProviderStatus(providerStatus) {
  if (!providerStatus) return 'pending';
  const status = String(providerStatus).toLowerCase().trim();

  switch (status) {
    case 'completed':
    case 'success':
    case 'fulfilled':
    case 'delivered':
    case 'approved':
      return 'approved';

    case 'processing':
    case 'in_progress':
    case 'running':
      return 'processing';

    case 'pending':
    case 'queued':
    case 'waiting':
    case 'created':
      return 'pending';

    case 'failed':
    case 'cancelled':
    case 'canceled':
    case 'declined':
    case 'error':
    case 'expired':
    case 'rejected':
      return 'rejected';

    case 'refunded':
    case 'refund':
      return 'refunded';

    default:
      // If the provider status is completely unknown, log it and map to pending as a safe fallback
      console.warn(`[StatusMapper] Unmapped provider status: "${providerStatus}". Defaulting to "pending".`);
      return 'pending';
  }
}

module.exports = {
  normalizeProviderStatus
};
