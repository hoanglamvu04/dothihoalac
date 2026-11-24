// Read-only release preflight for saved-search notifications.
// Do not load models or create indexes in this module.
export function verifyDiscoveryIndexes(savedIndexes = [], notificationIndexes = []) {
  const savedSearchUnique = savedIndexes.some((index) =>
    index.name === 'saved_search_per_user_unique' &&
    index.unique === true &&
    index.key?.userId === 1 &&
    index.key?.queryNormalized === 1 &&
    index.key?.contentType === 1 &&
    index.key?.areaId === 1
  );
  const notificationDedupeUnique = notificationIndexes.some((index) =>
    index.name === 'unique_notification_dedupe' &&
    index.unique === true &&
    index.key?.recipientId === 1 &&
    index.key?.dedupeKey === 1 &&
    index.partialFilterExpression?.dedupeKey?.$type === 'string'
  );
  return {
    savedSearchUnique,
    notificationDedupeUnique,
    pass: savedSearchUnique && notificationDedupeUnique,
  };
}

function summarizeConflicts(value) {
  return {
    groups: Number(value?.groups || 0),
    extraRecords: Number(value?.extraRecords || 0),
  };
}

async function duplicateGroups(collection, fields, filter = null) {
  const id = Object.fromEntries(fields.map((field) => [field, '$' + field]));
  const pipeline = [
    ...(filter ? [{ $match: filter }] : []),
    { $group: { _id: id, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $group: {
      _id: null,
      groups: { $sum: 1 },
      extraRecords: { $sum: { $subtract: ['$count', 1] } },
    } },
    { $project: { _id: 0, groups: 1, extraRecords: 1 } },
  ];
  const [result] = await collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
  return summarizeConflicts(result);
}

export async function readDiscoveryPreflight(db) {
  // Only listCollections/listIndexes/aggregate; no writes or schema changes.
  const names = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((entry) => entry.name),
  );
  const savedSearchCollectionExists = names.has('savedsearches');
  const notificationCollectionExists = names.has('notifications');
  const saved = savedSearchCollectionExists ? db.collection('savedsearches') : null;
  const notifications = notificationCollectionExists ? db.collection('notifications') : null;
  const [savedIndexes, notificationIndexes, savedSearchDuplicates, notificationDuplicates] =
    await Promise.all([
      saved ? saved.listIndexes().toArray() : [],
      notifications ? notifications.listIndexes().toArray() : [],
      saved
        ? duplicateGroups(saved, ['userId', 'queryNormalized', 'contentType', 'areaId'])
        : summarizeConflicts(null),
      notifications
        ? duplicateGroups(notifications, ['recipientId', 'dedupeKey'], {
          dedupeKey: { $type: 'string' },
        })
        : summarizeConflicts(null),
    ]);
  const indexes = verifyDiscoveryIndexes(savedIndexes, notificationIndexes);
  const pass = indexes.pass &&
    savedSearchDuplicates.groups === 0 &&
    notificationDuplicates.groups === 0;
  return {
    status: pass ? 'PASS' : 'FAIL',
    readOnly: true,
    savedSearchCollectionExists,
    notificationCollectionExists,
    savedSearchUnique: indexes.savedSearchUnique,
    notificationDedupeUnique: indexes.notificationDedupeUnique,
    savedSearchDuplicates,
    notificationDuplicates,
  };
}
