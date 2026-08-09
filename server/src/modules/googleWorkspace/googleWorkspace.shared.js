import mongoose from 'mongoose';

import { GoogleWorkspaceConnection } from './googleWorkspace.model.js';
import {
  GoogleWorkspaceError,
  assertAllowedGoogleAccount,
  decryptGoogleSecret,
  getGoogleDriveAbout,
  getGoogleUserInfo,
  refreshGoogleAccessToken,
} from './googleWorkspace.service.js';

const CONNECTION_KEY = 'primary';
const DEFAULT_KTHL_DB = 'kientruchoalac';
const COLLECTION = 'googleworkspaceconnections';

function sharedDatabaseName() {
  return String(
    process.env.GOOGLE_WORKSPACE_SHARED_DB ||
      DEFAULT_KTHL_DB,
  ).trim() || DEFAULT_KTHL_DB;
}

async function rawKthlConnection() {
  const databaseName = sharedDatabaseName();
  const database = mongoose.connection.useDb(
    databaseName,
    { useCache: true },
  );

  const source = await database
    .collection(COLLECTION)
    .findOne({
      key: CONNECTION_KEY,
      connected: true,
    });

  return {
    databaseName,
    source,
  };
}

export async function getKthlSharedConnectionStatus() {
  try {
    const { databaseName, source } =
      await rawKthlConnection();

    return {
      available: Boolean(
        source?.connected &&
          source?.refreshTokenEncrypted,
      ),
      databaseName,
      email: source?.email || '',
      displayName:
        source?.displayName || '',
      picture: source?.picture || '',
    };
  } catch (error) {
    return {
      available: false,
      databaseName: sharedDatabaseName(),
      email: '',
      displayName: '',
      picture: '',
      error: String(
        error?.message ||
          'Không đọc được kết nối KTHL.',
      ).slice(0, 220),
    };
  }
}

export async function adoptKthlGoogleConnection(
  userId,
) {
  const { databaseName, source } =
    await rawKthlConnection();

  if (
    !source?.connected ||
    !source?.refreshTokenEncrypted
  ) {
    throw new GoogleWorkspaceError(
      'Kiến Trúc Hòa Lạc chưa có kết nối Google Workspace đang hoạt động trong MongoDB dùng chung.',
      'KTHL_SHARED_CONNECTION_NOT_FOUND',
      404,
    );
  }

  let refreshToken;

  try {
    refreshToken = decryptGoogleSecret(
      source.refreshTokenEncrypted,
    );
  } catch {
    throw new GoogleWorkspaceError(
      'Không giải mã được kết nối Google của Kiến Trúc Hòa Lạc. GOOGLE_TOKEN_ENCRYPTION_KEY của DTHL phải giống KTHL.',
      'KTHL_SHARED_TOKEN_DECRYPT_FAILED',
      409,
    );
  }

  const tokenData =
    await refreshGoogleAccessToken(
      refreshToken,
    );

  const [userInfo, drive] =
    await Promise.all([
      getGoogleUserInfo(
        tokenData.access_token,
      ),
      getGoogleDriveAbout(
        tokenData.access_token,
      ),
    ]);

  const email =
    assertAllowedGoogleAccount(
      userInfo,
    );

  const connection =
    (await GoogleWorkspaceConnection.findOne({
      key: CONNECTION_KEY,
    }).select('+refreshTokenEncrypted')) ||
    new GoogleWorkspaceConnection({
      key: CONNECTION_KEY,
    });

  connection.connected = true;
  connection.googleAccountId = String(
    userInfo.sub ||
      source.googleAccountId ||
      '',
  );
  connection.email = email;
  connection.displayName = String(
    userInfo.name ||
      drive?.user?.displayName ||
      source.displayName ||
      '',
  );
  connection.picture = String(
    userInfo.picture ||
      drive?.user?.photoLink ||
      source.picture ||
      '',
  );
  connection.refreshTokenEncrypted =
    source.refreshTokenEncrypted;
  connection.scopes = Array.isArray(
    source.scopes,
  )
    ? source.scopes
    : [];
  connection.tokenType = String(
    source.tokenType || 'Bearer',
  );
  connection.drivePermissionId = String(
    drive?.user?.permissionId ||
      source.drivePermissionId ||
      '',
  );
  connection.connectedBy = userId;
  connection.connectedAt = new Date();
  connection.lastCheckedAt = new Date();
  connection.lastError = '';
  connection.credentialSource =
    'kthl_shared';
  connection.sharedSourceDb = databaseName;

  await connection.save();

  return connection;
}
