import mongoose from 'mongoose';

export async function buildSeedSummary() {
  const names = [
    'users', 'userprofiles', 'roles', 'permissions', 'categories', 'tags', 'areas', 'media',
    'contents', 'contentbodies', 'articles', 'communityposts', 'propertylistings', 'jobposts',
    'comments', 'reactions', 'bookmarks', 'follows', 'notifications', 'reports', 'leadrequests',
    'systemsettings', 'staticpages', 'banners',
  ];
  const summary = {};
  for (const name of names) {
    const collection = mongoose.connection.collections[name];
    summary[name] = collection ? await collection.countDocuments() : 0;
  }
  return summary;
}
