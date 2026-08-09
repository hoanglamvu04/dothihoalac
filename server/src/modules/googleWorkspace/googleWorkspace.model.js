import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const folderYearSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    yearFolderId: { type: String, default: '' },
    templateFolderId: { type: String, default: '' },
    draftFolderId: { type: String, default: '' },
    reviewFolderId: { type: String, default: '' },
    publishedFolderId: { type: String, default: '' },
    archiveFolderId: { type: String, default: '' },
    setupAt: { type: Date, default: null },
  },
  { _id: false, strict: true },
);

const connectionSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'primary', index: true },
    connected: { type: Boolean, default: false, index: true },
    googleAccountId: { type: String, default: '', index: true },
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    displayName: { type: String, default: '' },
    picture: { type: String, default: '' },
    refreshTokenEncrypted: { type: String, default: '', select: false },
    scopes: [{ type: String }],
    tokenType: { type: String, default: 'Bearer' },
    drivePermissionId: { type: String, default: '' },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    connectedAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    rootDriveId: { type: String, default: '' },
    rootFolderId: { type: String, default: '' },
    rootFolderName: { type: String, default: '' },
    folderYears: { type: [folderYearSchema], default: [] },
  },
  { timestamps: true, strict: true, collection: 'googleworkspaceconnections' },
);

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'googledocumentcounters' },
);

export const GoogleWorkspaceConnection = getOrCreateModel(
  'GoogleWorkspaceConnection',
  connectionSchema,
  'googleworkspaceconnections',
);

export const GoogleDocumentCounter = getOrCreateModel(
  'GoogleDocumentCounter',
  counterSchema,
  'googledocumentcounters',
);
