import mongoose from 'mongoose';

export function getOrCreateModel(name, schema, collection) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

export const objectId = mongoose.Schema.Types.ObjectId;
