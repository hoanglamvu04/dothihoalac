import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import ArticleBody from '../../components/content/ArticleBody';
import { LoadingBlock } from '../../components/common/Loading';
import { systemApi } from '../../api/content.api';

const fallbacks = {
  'gioi-thieu': { title: 'Giới thiệu Đô Thị Hòa Lạc', body: '<p>Đô Thị Hòa Lạc là nền tảng thông tin và cộng đồng địa phương thuộc Media Space, hệ sinh thái XSpace.</p><h2>Sứ mệnh</h2><p>Tổ chức thông tin Hòa Lạc theo cách rõ ràng, hữu ích và có khả năng kết nối nhu cầu thực tế của người dùng.</p>' },
  'dieu-khoan-su-dung': { title: 'Điều khoản sử dụng', body: '<p>Người dùng chịu trách nhiệm với nội dung do mình đăng tải và phải tuân thủ quy định pháp luật, chính sách kiểm duyệt của nền tảng.</p>' },
  'chinh-sach-quyen-rieng-tu': { title: 'Chính sách quyền riêng tư', body: '<p>Đô Thị Hòa Lạc chỉ thu thập dữ liệu cần thiết để vận hành tài khoản, nội dung và các yêu cầu tư vấn mà người dùng chủ động gửi.</p>' },
  'quy-dinh-dang-bai': { title: 'Quy định đăng bài', body: '<p>Không đăng nội dung sai sự thật, lừa đảo, xâm phạm quyền riêng tư, vi phạm bản quyền hoặc quảng cáo rác.</p>' },
};

export default function StaticPage({ fixedSlug }) {
  const params = useParams();
  const slug = fixedSlug || params.slug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    systemApi.page(slug).then(setPage).catch(() => setPage(fallbacks[slug] || { title: 'Thông tin', body: '<p>Nội dung đang được cập nhật.</p>' })).finally(() => setLoading(false));
  }, [slug]);
  return <section className="page-section"><Seo title={page?.title || 'Thông tin'} /><div className="container static-page">{loading ? <LoadingBlock /> : <><h1>{page.title}</h1><ArticleBody html={page.body} /></>}</div></section>;
}
