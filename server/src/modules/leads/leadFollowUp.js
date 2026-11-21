const FINISHED_LEAD_STATUSES = ['won', 'lost', 'closed'];

export function normalizeLeadFollowUp(value) {
  if (value === null || value === '') return null;
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Thời gian nhắc lại không hợp lệ.');
  }
  return date;
}

export function overdueLeadFilter(now = new Date()) {
  return {
    status: { $nin: FINISHED_LEAD_STATUSES },
    nextFollowUpAt: { $ne: null, $lte: now },
  };
}
