export const NOTIFICATION_TYPES = Object.freeze({
  POST_APPROVED: 'post_approved',
  POST_REJECTED: 'post_rejected',
  POST_NEEDS_REVISION: 'post_needs_revision',
  NEW_REACTION: 'new_reaction',
  NEW_COMMENT: 'new_comment',
  COMMENT_REPLY: 'comment_reply',
  MENTION: 'mention',
  NEW_FOLLOWER: 'new_follower',
  LISTING_EXPIRING: 'listing_expiring',
  LISTING_EXPIRED: 'listing_expired',
  REPORT_RESOLVED: 'report_resolved',
  ACCOUNT_WARNING: 'account_warning',
  SYSTEM_NOTICE: 'system_notice',
});
export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES);
