import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import Media from '../media/media.model.js';
import { uploadImage as storeMediaImage } from '../media/media.service.js';
import { GoogleWorkspaceError } from './googleWorkspace.service.js';

const MAX_IMAGE_BYTES = Math.max(
  1,
  Number(env.MAX_IMAGE_SIZE_MB || 10),
) * 1024 * 1024;

const MAX_IMAGES = Math.max(
  1,
  Number(env.MAX_IMAGES_PER_CONTENT || 20),
);

function safeText(value = '', max = 50000) {
  return String(value || '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, max);
}

function safeDocName(value = '') {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeLinkUrl(value = '') {
  const url = String(value || '').trim();

  return /^(https?:\/\/|mailto:|tel:)/i.test(url)
    ? url
    : '';
}

function textRunHtml(content, textStyle = {}) {
  if (!content) return '';

  let html = escapeHtml(content)
    .replace(/\n/g, '<br>');

  if (textStyle.bold === true) {
    html = `<strong>${html}</strong>`;
  }

  if (textStyle.italic === true) {
    html = `<em>${html}</em>`;
  }

  if (textStyle.underline === true) {
    html = `<u>${html}</u>`;
  }

  if (textStyle.strikethrough === true) {
    html = `<s>${html}</s>`;
  }

  const href = safeLinkUrl(
    textStyle?.link?.url,
  );

  if (href) {
    html = `<a href="${escapeHtml(href)}" target="_blank" rel="nofollow noopener noreferrer">${html}</a>`;
  }

  return html;
}

function summaryTextFromRow(row) {
  const text = safeText(row?.text, 1000);
  if (!text) return '';

  const marker = text.match(
    /^(?:\[?\s*sapo\s*\]?|mô\s*tả(?:\s*ngắn)?|mo\s*ta(?:\s*ngan)?)\s*[:：-]\s*(.+)$/iu,
  );

  if (marker?.[1]) {
    return safeText(marker[1], 1000);
  }

  return row?.namedStyle === 'SUBTITLE'
    ? text
    : '';
}

function imageObjectFromDocument(document, objectId) {
  const inline = document?.inlineObjects?.[objectId]
    ?.inlineObjectProperties
    ?.embeddedObject;

  if (inline?.imageProperties) {
    return {
      objectId,
      kind: 'inline',
      embedded: inline,
    };
  }

  const positioned = document?.positionedObjects?.[objectId]
    ?.positionedObjectProperties
    ?.embeddedObject;

  if (positioned?.imageProperties) {
    return {
      objectId,
      kind: 'positioned',
      embedded: positioned,
    };
  }

  return null;
}

function imageAltFromEmbedded(embedded, title) {
  const combined = [
    safeText(embedded?.title, 180),
    safeText(embedded?.description, 260),
  ]
    .filter(Boolean)
    .join(' — ');

  return safeText(
    combined || `${title || 'Bài viết'} - hình minh họa`,
    300,
  );
}

function imageCaptionFromEmbedded(embedded, title) {
  return safeText(
    embedded?.description ||
      embedded?.title ||
      `Hình minh họa cho ${title || 'bài viết'}`,
    500,
  );
}

async function fetchGoogleImage(contentUri, accessToken) {
  const request = async (withAuth = false) =>
    fetch(contentUri, {
      redirect: 'follow',
      headers: {
        Accept: 'image/*',
        ...(withAuth && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
    });

  let response = await request(false);

  if (!response.ok && accessToken) {
    response = await request(true);
  }

  return response;
}

async function downloadGoogleImage(contentUri, accessToken) {
  if (!contentUri) {
    throw new GoogleWorkspaceError(
      'Google Docs có ảnh nhưng không trả về contentUri.',
      'GOOGLE_DOC_IMAGE_URI_MISSING',
      502,
    );
  }

  const response = await fetchGoogleImage(
    contentUri,
    accessToken,
  );

  if (!response.ok) {
    throw new GoogleWorkspaceError(
      `Không tải được ảnh Google Docs (HTTP ${response.status}).`,
      'GOOGLE_DOC_IMAGE_DOWNLOAD_FAILED',
      502,
    );
  }

  const declaredLength = Number(
    response.headers.get('content-length') || 0,
  );

  if (declaredLength > MAX_IMAGE_BYTES) {
    throw new GoogleWorkspaceError(
      `Ảnh trong Google Docs vượt quá ${env.MAX_IMAGE_SIZE_MB} MB.`,
      'GOOGLE_DOC_IMAGE_TOO_LARGE',
      400,
    );
  }

  const contentType = String(
    response.headers.get('content-type') || 'image/png',
  )
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!contentType.startsWith('image/')) {
    throw new GoogleWorkspaceError(
      'Google Docs trả về dữ liệu không phải ảnh.',
      'GOOGLE_DOC_IMAGE_INVALID_TYPE',
      502,
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer(),
  );

  if (!buffer.length) {
    throw new GoogleWorkspaceError(
      'Ảnh Google Docs tải về bị rỗng.',
      'GOOGLE_DOC_IMAGE_EMPTY',
      502,
    );
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new GoogleWorkspaceError(
      `Ảnh trong Google Docs vượt quá ${env.MAX_IMAGE_SIZE_MB} MB.`,
      'GOOGLE_DOC_IMAGE_TOO_LARGE',
      400,
    );
  }

  return {
    buffer,
    contentType,
  };
}

function sha256(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

function extensionForMimeType(contentType = '') {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  return 'png';
}

async function activePreviousMedia(previous) {
  const mediaId = String(previous?.mediaId || '').trim();

  if (!/^[0-9a-f]{24}$/i.test(mediaId)) {
    return null;
  }

  return Media.findOne({
    _id: mediaId,
    resourceType: 'image',
    status: 'active',
    deletedAt: null,
  }).lean();
}

function storedImageFromMedia({
  media,
  objectId,
  hash = '',
  alt,
  caption,
  reused = true,
}) {
  if (!media) return null;

  const url = String(
    media.secureUrl || media.url || '',
  ).trim();

  if (!url) return null;

  return {
    objectId,
    mediaId: String(media._id),
    publicId: media.publicId || '',
    url,
    hash,
    alt: safeText(alt || media.altText, 300),
    caption: safeText(caption, 500),
    syncedAt: new Date().toISOString(),
    reused,
  };
}

async function fallbackPreviousImage({
  previous,
  objectId,
  alt,
  caption,
}) {
  const media = await activePreviousMedia(previous);

  return storedImageFromMedia({
    media,
    objectId,
    hash: previous?.hash || '',
    alt: alt || previous?.alt,
    caption: caption || previous?.caption,
    reused: true,
  });
}

async function storeGoogleDocImage({
  content,
  ownerId,
  objectId,
  embedded,
  accessToken,
  previous,
  title,
}) {
  const contentUri =
    embedded?.imageProperties?.contentUri;

  const { buffer, contentType } =
    await downloadGoogleImage(
      contentUri,
      accessToken,
    );

  const hash = sha256(buffer);
  const alt = imageAltFromEmbedded(
    embedded,
    title,
  );
  const caption = imageCaptionFromEmbedded(
    embedded,
    title,
  );

  if (previous?.hash === hash) {
    const media = await activePreviousMedia(
      previous,
    );

    const reused = storedImageFromMedia({
      media,
      objectId,
      hash,
      alt,
      caption,
      reused: true,
    });

    if (reused) return reused;
  }

  const extension = extensionForMimeType(
    contentType,
  );

  const media = await storeMediaImage(
    { _id: ownerId },
    {
      buffer,
      size: buffer.length,
      originalname: `gdoc-${objectId}.${extension}`,
      mimetype: contentType,
    },
    {
      altText: alt,
      folder: `articles-google-docs-${content._id}`,
    },
  );

  return storedImageFromMedia({
    media,
    objectId,
    hash,
    alt,
    caption,
    reused: false,
  });
}

function paragraphListType(document, paragraph) {
  const listId = paragraph?.bullet?.listId;
  if (!listId) return '';

  const nestingLevel = Number(
    paragraph?.bullet?.nestingLevel || 0,
  );

  const level =
    document?.lists?.[listId]
      ?.listProperties?.nestingLevels?.[
        nestingLevel
      ];

  const glyphType = String(
    level?.glyphType || '',
  ).toUpperCase();

  return glyphType.includes('DECIMAL') ||
    glyphType.includes('ALPHA') ||
    glyphType.includes('ROMAN')
    ? 'ol'
    : 'ul';
}

function collectDocumentRows(document) {
  const rows = [];

  for (const structuralElement of
    document?.body?.content || []) {
    const paragraph =
      structuralElement?.paragraph;

    if (!paragraph) continue;

    const namedStyle = String(
      paragraph?.paragraphStyle
        ?.namedStyleType || 'NORMAL_TEXT',
    ).toUpperCase();

    const listType = paragraphListType(
      document,
      paragraph,
    );

    const elements = paragraph.elements || [];
    let lastTextIndex = -1;

    for (let index = elements.length - 1; index >= 0; index -= 1) {
      if (elements[index]?.textRun?.content) {
        lastTextIndex = index;
        break;
      }
    }

    let textBuffer = '';
    let htmlBuffer = '';

    const flushText = () => {
      const text = textBuffer
        .replace(/\n+$/g, '')
        .trim();

      const html = htmlBuffer.trim();

      textBuffer = '';
      htmlBuffer = '';

      if (!text) return;

      rows.push({
        kind: 'text',
        text,
        html: html || escapeHtml(text),
        namedStyle,
        listType,
      });
    };

    elements.forEach((element, index) => {
      if (element?.textRun?.content) {
        let content = String(
          element.textRun.content,
        ).replace(/\r/g, '');

        if (index === lastTextIndex) {
          content = content.replace(/\n+$/g, '');
        }

        if (content) {
          textBuffer += content;
          htmlBuffer += textRunHtml(
            content,
            element.textRun.textStyle || {},
          );
        }

        return;
      }

      const objectId =
        element?.inlineObjectElement
          ?.inlineObjectId;

      if (objectId) {
        flushText();
        rows.push({
          kind: 'image',
          objectId,
        });
      }
    });

    flushText();

    for (const objectId of
      paragraph.positionedObjectIds || []) {
      rows.push({
        kind: 'image',
        objectId,
      });
    }
  }

  return rows;
}

function inlineHtml(block) {
  return block?.html ||
    escapeHtml(block?.text || '');
}

function blocksToHtml(blocks = []) {
  const html = [];
  let activeList = '';

  const closeList = () => {
    if (!activeList) return;
    html.push(`</${activeList}>`);
    activeList = '';
  };

  for (const block of blocks) {
    if (
      block.type === 'ul' ||
      block.type === 'ol'
    ) {
      if (activeList !== block.type) {
        closeList();
        activeList = block.type;
        html.push(`<${activeList}>`);
      }

      for (const item of block.items || []) {
        html.push(
          `<li>${
            typeof item === 'string'
              ? escapeHtml(item)
              : inlineHtml(item)
          }</li>`,
        );
      }

      continue;
    }

    closeList();

    if (block.type === 'h2') {
      html.push(
        `<h2>${inlineHtml(block)}</h2>`,
      );
      continue;
    }

    if (block.type === 'h3') {
      html.push(
        `<h3>${inlineHtml(block)}</h3>`,
      );
      continue;
    }

    if (block.type === 'h4') {
      html.push(
        `<h4>${inlineHtml(block)}</h4>`,
      );
      continue;
    }

    if (
      block.type === 'image' &&
      block.url &&
      block.mediaId
    ) {
      const mediaId = escapeHtml(
        block.mediaId,
      );

      html.push(
        `<figure class="article-inline-image article-inline-image--full" data-media-id="${mediaId}">` +
          `<img data-media-id="${mediaId}" src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" decoding="async" />` +
          `<figcaption>${escapeHtml(block.caption)}</figcaption>` +
          '</figure>',
      );

      continue;
    }

    if (block.text) {
      html.push(
        `<p>${inlineHtml(block)}</p>`,
      );
    }
  }

  closeList();

  return html.join('\n');
}

export async function syncGoogleDocsArticleContent({
  document,
  content,
  article,
  ownerId,
  accessToken,
}) {
  const rows = collectDocumentRows(document);
  const textRows = rows.filter(
    (row) => row.kind === 'text',
  );

  if (!textRows.length) {
    throw new GoogleWorkspaceError(
      'Google Docs chưa có nội dung chữ.',
      'GOOGLE_DOC_EMPTY',
      400,
    );
  }

  const earlyTextRows = textRows.slice(0, 3);
  let titleRow = earlyTextRows.find(
    (row) =>
      row.namedStyle === 'TITLE' ||
      row.namedStyle === 'HEADING_1',
  );

  if (!titleRow) {
    titleRow = textRows[0];
  }

  const title = safeDocName(
    titleRow?.text,
  );

  if (!title || title.length < 5) {
    throw new GoogleWorkspaceError(
      'Tiêu đề Google Docs quá ngắn. Hãy dùng dòng đầu tiên hoặc Title/Heading 1 làm tiêu đề.',
      'GOOGLE_DOC_TITLE_INVALID',
      400,
    );
  }

  const titleTextIndex = Math.max(
    textRows.indexOf(titleRow),
    0,
  );

  const summaryRow = textRows
    .slice(titleTextIndex + 1, titleTextIndex + 7)
    .find((row) => Boolean(summaryTextFromRow(row))) || null;

  const summary = summaryRow
    ? summaryTextFromRow(summaryRow)
    : '';

  const imageRows = rows.filter(
    (row) => row.kind === 'image',
  );

  if (imageRows.length > MAX_IMAGES) {
    throw new GoogleWorkspaceError(
      `Bài viết có ${imageRows.length} ảnh, vượt giới hạn ${MAX_IMAGES} ảnh.`,
      'GOOGLE_DOC_IMAGE_LIMIT_EXCEEDED',
      400,
    );
  }

  const previousMap =
    article?.googleDocImageMap &&
    typeof article.googleDocImageMap ===
      'object'
      ? { ...article.googleDocImageMap }
      : {};

  const imageMap = {};
  const imageUrls = [];
  const imageMediaIds = [];
  const blocks = [];
  const seenObjectIds = new Set();

  let coverMediaId = '';
  let coverUrl = '';

  for (const row of rows) {
    if (row.kind === 'image') {
      if (
        !row.objectId ||
        seenObjectIds.has(row.objectId)
      ) {
        continue;
      }

      seenObjectIds.add(row.objectId);

      const object = imageObjectFromDocument(
        document,
        row.objectId,
      );

      if (!object) continue;

      const previous =
        previousMap[row.objectId];

      const alt = imageAltFromEmbedded(
        object.embedded,
        title,
      );

      const caption =
        imageCaptionFromEmbedded(
          object.embedded,
          title,
        );

      let stored = null;

      try {
        stored = await storeGoogleDocImage({
          content,
          ownerId,
          objectId: row.objectId,
          embedded: object.embedded,
          accessToken,
          previous,
          title,
        });
      } catch (error) {
        console.warn(
          `[GoogleDocsImageSync] ${row.objectId}: ${error.message}`,
        );

        stored = await fallbackPreviousImage({
          previous,
          objectId: row.objectId,
          alt,
          caption,
        }).catch(() => null);
      }

      if (!stored) {
        continue;
      }

      imageMap[row.objectId] = stored;

      if (!imageUrls.includes(stored.url)) {
        imageUrls.push(stored.url);
      }

      if (
        !imageMediaIds.includes(
          stored.mediaId,
        )
      ) {
        imageMediaIds.push(
          stored.mediaId,
        );
      }

      // Ảnh đầu tiên vẫn là thumbnail/ảnh bìa cho card, SEO và danh sách,
      // nhưng không được xóa khỏi thân bài. Vị trí trong Google Docs là nguồn sự thật.
      if (!coverMediaId) {
        coverMediaId = stored.mediaId;
        coverUrl = stored.url;
      }

      blocks.push({
        type: 'image',
        mediaId: stored.mediaId,
        url: stored.url,
        alt: stored.alt || alt,
        caption:
          stored.caption || caption,
      });

      continue;
    }

    if (row === titleRow) {
      continue;
    }

    // Sapo chỉ tồn tại khi biên tập viên chủ động dùng style Subtitle
    // hoặc viết tiền tố "SAPO:"/"Mô tả:". Không tự lấy đoạn thân bài đầu tiên.
    if (row === summaryRow) {
      continue;
    }

    if (row.listType) {
      const previous =
        blocks[blocks.length - 1];

      const item = {
        text: row.text,
        html: row.html,
      };

      if (
        previous?.type === row.listType
      ) {
        previous.items.push(item);
      } else {
        blocks.push({
          type: row.listType,
          items: [item],
        });
      }

      continue;
    }

    let type = 'p';

    if (
      row.namedStyle === 'HEADING_1' ||
      row.namedStyle === 'TITLE' ||
      row.namedStyle === 'HEADING_2'
    ) {
      type = 'h2';
    } else if (
      row.namedStyle === 'HEADING_3'
    ) {
      type = 'h3';
    } else if (
      row.namedStyle === 'HEADING_4'
    ) {
      type = 'h4';
    }

    blocks.push({
      type,
      text: row.text,
      html: row.html,
    });
  }

  const meaningful = blocks.filter(
    (block) =>
      block.type === 'image' ||
      Boolean(block.text) ||
      Boolean(block.items?.length),
  );

  if (!meaningful.length) {
    throw new GoogleWorkspaceError(
      'Google Docs mới có tiêu đề nhưng chưa có nội dung bài viết.',
      'GOOGLE_DOC_CONTENT_EMPTY',
      400,
    );
  }

  return {
    title,
    summary,
    summaryDetected: Boolean(summaryRow),
    bodyHtml: blocksToHtml(meaningful),
    imageMap,
    imageUrls,
    imageMediaIds,
    imageCount: imageMediaIds.length,
    inlineImageCount: imageMediaIds.length,
    coverMediaId,
    coverUrl,
  };
}
