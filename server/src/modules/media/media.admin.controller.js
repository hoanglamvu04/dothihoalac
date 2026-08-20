import * as mediaAdminService from './media.admin.service.js';

export async function list(req, res) {
  res.json({ success: true, data: await mediaAdminService.listAdminMedia(req.query) });
}

export async function stats(req, res) {
  res.json({ success: true, data: await mediaAdminService.mediaStats() });
}

export async function usage(req, res) {
  res.json({ success: true, data: await mediaAdminService.usage(req.params.id) });
}

export async function updateAlt(req, res) {
  res.json({
    success: true,
    data: await mediaAdminService.updateAlt(req.params.id, req.body.altText),
  });
}
