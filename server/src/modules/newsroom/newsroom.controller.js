import { sendSuccess } from '../../utils/apiResponse.js';
import * as newsroomService from './newsroom.service.js';

export async function overview(_req, res) {
  return sendSuccess(res, {
    data: await newsroomService.overview(),
  });
}

export async function listStories(req, res) {
  const result = await newsroomService.listStories(req.query);
  return sendSuccess(res, {
    data: result.items,
    meta: result.meta,
  });
}

export async function storyDetail(req, res) {
  return sendSuccess(res, {
    data: await newsroomService.storyDetail(req.params.id),
  });
}

export async function triggerScout(req, res) {
  const task = await newsroomService.triggerScout(req.user?._id || null);
  return sendSuccess(res, {
    statusCode: 202,
    data: { taskId: String(task._id), status: task.status },
    message: 'Đã đưa lượt săn tin vào hàng đợi.',
  });
}

export async function runStory(req, res) {
  const result = await newsroomService.enqueueStoryPipeline(
    req.params.id,
    req.user?._id || null,
  );
  return sendSuccess(res, {
    statusCode: 202,
    data: result,
    message: result.alreadyReady
      ? 'Bài đã ở hàng chờ duyệt website.'
      : 'Đã đưa bước tiếp theo của story vào hàng đợi.',
  });
}
