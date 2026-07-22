import Comment from '../modules/comments/comment.model.js';
import Reaction from '../modules/reactions/reaction.model.js';
import Bookmark from '../modules/bookmarks/bookmark.model.js';
import Follow from '../modules/follows/follow.model.js';
import Content from '../modules/contents/content.model.js';
import CommunityPost from '../modules/community/communityPost.model.js';
import ContentRevision from '../modules/contents/contentRevision.model.js';
import UsernameHistory from '../modules/users/usernameHistory.model.js';
import PropertyContact from '../modules/properties/propertyContact.model.js';

export async function seedInteractions({ users, articles, community, properties, areas, categories, tags }) {
  const targetContents = [
    articles['tong-quan-quy-hoach-hoa-lac'],
    articles['bay-buoc-chuan-bi-truoc-khi-xay-nha'],
    community['hoi-tuyen-xe-buyt-tu-trung-tam-den-hoa-lac'],
    community['phan-anh-doan-duong-ngap-sau-mua'],
    properties['ban-dat-thach-hoa-120m2-duong-o-to']?.content,
  ].filter(Boolean);

  const commentSpecs = [
    [targetContents[0], users.resident, 'Bài viết tổng hợp rõ ràng, mong có thêm bản đồ khu vực.'],
    [targetContents[0], users.student, 'Phần giao thông rất hữu ích với sinh viên mới chuyển đến.'],
    [targetContents[1], users.business, 'Khi lập ngân sách nên dự phòng thêm chi phí thiết kế và phát sinh.'],
    [targetContents[2], users.resident, 'Bạn có thể tham khảo tuyến buýt kết nối Đại lộ Thăng Long rồi chuyển tuyến nội khu.'],
    [targetContents[3], users.member, 'Mình cũng gặp tình trạng này sau trận mưa tuần trước.'],
  ];
  const comments = [];
  for (const [content, user, body] of commentSpecs) {
    if (!content) continue;
    const comment = await Comment.findOneAndUpdate(
      { contentId: content._id, userId: user._id, body },
      { $set: { status: 'published', deletedAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    comments.push(comment);
  }

  if (comments[3]) {
    const reply = await Comment.findOneAndUpdate(
      { contentId: comments[3].contentId, userId: users.student._id, parentId: comments[3]._id },
      { $set: { body: 'Cảm ơn bạn, mình sẽ thử tuyến này vào cuối tuần.', status: 'published', deletedAt: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    comments.push(reply);
    await CommunityPost.updateOne(
      { contentId: comments[3].contentId },
      { acceptedCommentId: comments[3]._id, questionStatus: 'answered' },
    );
  }

  const userList = [users.resident, users.student, users.member, users.broker, users.business];
  const reactionTypes = ['like', 'interested', 'helpful', 'surprised', 'disagree'];
  for (let index = 0; index < targetContents.length; index += 1) {
    const content = targetContents[index];
    for (let userIndex = 0; userIndex < userList.length; userIndex += 1) {
      if (!content) continue;
      await Reaction.findOneAndUpdate(
        { userId: userList[userIndex]._id, targetType: 'content', targetId: content._id },
        { $set: { reactionType: reactionTypes[(index + userIndex) % reactionTypes.length] } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const comment of comments.slice(0, 4)) {
    await Reaction.findOneAndUpdate(
      { userId: users.resident._id, targetType: 'comment', targetId: comment._id },
      { $set: { reactionType: 'helpful' } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  for (const content of targetContents.slice(0, 4)) {
    await Bookmark.findOneAndUpdate(
      { userId: users.student._id, contentId: content._id },
      { $setOnInsert: { userId: users.student._id, contentId: content._id } },
      { upsert: true, new: true },
    );
  }

  const followSpecs = [
    [users.student, 'area', areas['dai-hoc-quoc-gia-ha-noi']._id],
    [users.resident, 'area', areas['hoa-lac']._id],
    [users.member, 'category', categories['article:quy-hoach']._id],
    [users.broker, 'tag', tags['gia-dat']._id],
    [users.student, 'user', users.editor._id],
  ];
  for (const [user, targetType, targetId] of followSpecs) {
    await Follow.findOneAndUpdate(
      { followerId: user._id, targetType, targetId },
      { $setOnInsert: { followerId: user._id, targetType, targetId } },
      { upsert: true, new: true },
    );
  }

  const property = properties['ban-dat-thach-hoa-120m2-duong-o-to']?.content;
  if (property) {
    for (const contactType of ['reveal_phone', 'copy_phone', 'send_request']) {
      await PropertyContact.findOneAndUpdate(
        { contentId: property._id, userId: users.member._id, contactType },
        { $set: { ipAddress: '127.0.0.1' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  const allContentIds = targetContents.map((item) => item._id);
  for (const contentId of allContentIds) {
    const [commentCount, reactionCount, bookmarkCount] = await Promise.all([
      Comment.countDocuments({ contentId, status: 'published', deletedAt: null }),
      Reaction.countDocuments({ targetType: 'content', targetId: contentId }),
      Bookmark.countDocuments({ contentId }),
    ]);
    await Content.updateOne({ _id: contentId }, { commentCount, reactionCount, bookmarkCount });
  }
  for (const comment of comments) {
    const reactionCount = await Reaction.countDocuments({ targetType: 'comment', targetId: comment._id });
    await Comment.updateOne({ _id: comment._id }, { reactionCount });
  }


  const revisedArticle = articles['tong-quan-quy-hoach-hoa-lac'];
  await ContentRevision.findOneAndUpdate(
    { contentId: revisedArticle._id, revisionNumber: 1 },
    {
      $set: {
        title: revisedArticle.title,
        summary: revisedArticle.summary,
        bodyHtml: '<p>Phiên bản nội dung mẫu trước khi cập nhật.</p>',
        changedBy: users.chiefEditor._id,
        changeNote: 'Seed lịch sử chỉnh sửa bài viết.',
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await UsernameHistory.findOneAndUpdate(
    { userId: users.resident._id, oldUsername: 'mailan_hoalac', newUsername: users.resident.username },
    { $set: { changedAt: new Date('2026-06-01T00:00:00.000Z') } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return { comments, targetContents };
}
