import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom';

import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { TaxonomyProvider } from '../context/TaxonomyContext';
import ScrollToTop from '../components/layout/ScrollToTop';
import PublicLayout from '../components/layout/PublicLayout';
import AccountLayout from '../components/layout/AccountLayout';
import AdminLayout from '../components/layout/AdminLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import GuestRoute from '../components/auth/GuestRoute';
import AdminRoute from '../components/auth/AdminRoute';
import EditorRouteId from '../components/routing/EditorRouteId';
import { PageLoading } from '../components/common/Loading';
import { isPersistedContentId } from '../utils/content';

const HomePage = lazy(() => import('../pages/public/HomePage'));
const ArticlesPage = lazy(() => import('../pages/public/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('../pages/public/ArticleDetailPage'));
const CommunityPage = lazy(() => import('../pages/public/CommunityPage'));
const CommunityDetailPage = lazy(() => import('../pages/public/CommunityDetailPage'));
const PropertiesPage = lazy(() => import('../pages/public/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('../pages/public/PropertyDetailPage'));
const JobsPage = lazy(() => import('../pages/public/JobsPage'));
const JobDetailPage = lazy(() => import('../pages/public/JobDetailPage'));
const SearchPage = lazy(() => import('../pages/public/SearchPage'));
const AreaPage = lazy(() => import('../pages/public/AreaPage'));
const PublicProfilePage = lazy(() => import('../pages/public/PublicProfilePage'));
const StaticPage = lazy(() => import('../pages/public/StaticPage'));
const ContactPage = lazy(() => import('../pages/public/ContactPage'));
const LeadPage = lazy(() => import('../pages/public/LeadPage'));
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const VerifyPhonePage = lazy(() => import('../pages/auth/VerifyPhonePage'));

const CreateHubPage = lazy(() => import('../pages/create/CreateHubPage'));
const ContentStudioEntryPage = lazy(() => import('../pages/create/ContentStudioEntryPage'));
const CommunityStudioPage = lazy(() => import('../pages/create/CommunityStudioPage'));
const PropertyStudioAdapter = lazy(() => import('../pages/create/PropertyStudioAdapter'));
const JobStudioPage = lazy(() => import('../pages/create/JobStudioPage'));
const NewsTipPage = lazy(() => import('../pages/create/NewsTipPage'));

const AccountOverviewPage = lazy(() => import('../pages/account/AccountOverviewPage'));
const ProfileSettingsPage = lazy(() => import('../pages/account/ProfileSettingsPage'));
const SecurityPage = lazy(() => import('../pages/account/SecurityPage'));
const SessionsPage = lazy(() => import('../pages/account/SessionsPage'));
const NotificationsPage = lazy(() => import('../pages/account/NotificationsPage'));
const MyContentPage = lazy(() => import('../pages/account/MyContentPage'));
const BookmarksPage = lazy(() => import('../pages/account/BookmarksPage'));
const ReportsPage = lazy(() => import('../pages/account/ReportsPage'));

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const ModerationQueuePage = lazy(() => import('../pages/admin/ModerationQueuePage'));
const AdminArticlesPage = lazy(() => import('../pages/admin/AdminArticlesPage'));
const AdminManagedContentPage = lazy(() => import('../pages/admin/AdminManagedContentPage'));
const AdminCommentsPage = lazy(() => import('../pages/admin/AdminCommentsPage'));
const AdminSourceWatchPage = lazy(() => import('../pages/admin/AdminSourceWatchPage'));
const ArticleWorkspacePage = lazy(() => import('../pages/admin/ArticleWorkspacePage'));
const GoogleDocsArticleLauncher = lazy(() => import('../pages/admin/GoogleDocsArticleLauncher'));
const GoogleWorkspacePage = lazy(() => import('../pages/admin/GoogleWorkspacePage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminLeadsPage = lazy(() => import('../pages/admin/AdminLeadsPage'));
const AdminAdsPage = lazy(() => import('../pages/admin/AdminAdsPage'));
const AdminTaxonomyPage = lazy(() => import('../pages/admin/AdminTaxonomyPage'));
const AdminSystemPage = lazy(() => import('../pages/admin/AdminSystemPage'));
const AdminLogsPage = lazy(() => import('../pages/admin/AdminLogsPage'));

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function AdminOnly({ children }) {
  return <AdminRoute>{children}</AdminRoute>;
}

function ProtectedEditor({ basePath, sessionPrefix, children }) {
  return (
    <Protected>
      <EditorRouteId basePath={basePath} sessionPrefix={sessionPrefix}>
        {children}
      </EditorRouteId>
    </Protected>
  );
}

function LegacyStudioRedirect({ type }) {
  const { editorId } = useParams();
  const location = useLocation();
  const queryId = new URLSearchParams(location.search).get('edit');
  const id = isPersistedContentId(queryId)
    ? queryId
    : isPersistedContentId(editorId)
      ? editorId
      : '';

  const base =
    type === 'community'
      ? '/studio/cong-dong'
      : type === 'property'
        ? '/studio/bat-dong-san'
        : '/studio/viec-lam';

  return <Navigate to={id ? `${base}/${encodeURIComponent(id)}` : base} replace />;
}

function RouterEffects() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RouterEffects />}>
      <Route
        path="quan-tri"
        element={
          <AdminOnly>
            <AdminLayout />
          </AdminOnly>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="kiem-duyet" element={<ModerationQueuePage />} />
        <Route path="bai-viet" element={<AdminArticlesPage />} />
        <Route path="cong-dong" element={<AdminManagedContentPage type="community" />} />
        <Route path="nha-dat" element={<AdminManagedContentPage type="property" />} />
        <Route path="viec-lam" element={<AdminManagedContentPage type="job" />} />
        <Route path="binh-luan" element={<AdminCommentsPage />} />
        <Route path="theo-doi-nguon" element={<AdminSourceWatchPage />} />

        <Route path="bai-viet/moi" element={<GoogleDocsArticleLauncher />} />
        <Route path="bai-viet/docs/moi" element={<GoogleDocsArticleLauncher />} />
        <Route path="bai-viet/:id" element={<ArticleWorkspacePage />} />
        <Route path="bai-viet/:id/sua" element={<ArticleWorkspacePage />} />
        <Route path="bai-viet/:id/docs" element={<GoogleDocsArticleLauncher />} />

        <Route path="nguoi-dung" element={<AdminUsersPage />} />
        <Route path="bao-cao" element={<AdminReportsPage />} />
        <Route path="khach-hang" element={<AdminLeadsPage />} />
        <Route path="quang-cao" element={<AdminAdsPage />} />
        <Route path="phan-loai" element={<AdminTaxonomyPage />} />
        <Route path="google-workspace" element={<GoogleWorkspacePage />} />
        <Route path="he-thong" element={<AdminSystemPage />} />
        <Route path="nhat-ky" element={<AdminLogsPage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tin-tuc" element={<ArticlesPage />} />
        <Route path="tin-tuc/:id/:slug" element={<ArticleDetailPage />} />
        <Route path="tin-tuc/:slug" element={<ArticleDetailPage />} />

        <Route path="cong-dong" element={<CommunityPage />} />
        <Route path="cong-dong/:id/:slug" element={<CommunityDetailPage />} />
        <Route path="cong-dong/:slug" element={<CommunityDetailPage />} />

        <Route path="bat-dong-san" element={<PropertiesPage />} />
        <Route path="bat-dong-san/:id/:slug" element={<PropertyDetailPage />} />
        <Route path="bat-dong-san/:slug" element={<PropertyDetailPage />} />

        <Route path="nha-dat" element={<Navigate to="/bat-dong-san" replace />} />
        <Route path="nha-dat/:id/:slug" element={<PropertyDetailPage />} />
        <Route path="nha-dat/:slug" element={<PropertyDetailPage />} />

        <Route path="viec-lam" element={<JobsPage />} />
        <Route path="viec-lam/:id/:slug" element={<JobDetailPage />} />
        <Route path="viec-lam/:slug" element={<JobDetailPage />} />

        <Route path="tim-kiem" element={<SearchPage />} />
        <Route path="khu-vuc/:slug" element={<AreaPage />} />
        <Route path="thanh-vien/:username" element={<PublicProfilePage />} />
        <Route path="lien-he" element={<ContactPage />} />
        <Route path="tu-van-kien-truc" element={<LeadPage type="architecture_design" />} />
        <Route path="uoc-tinh-chi-phi-xay-dung" element={<LeadPage type="cost_estimation" />} />
        <Route path="tim-homestay" element={<LeadPage type="homestay_search" />} />
        <Route path="dat-villa" element={<LeadPage type="villa_booking" />} />
        <Route path="trang/:slug" element={<StaticPage />} />
        <Route path="gioi-thieu" element={<StaticPage fixedSlug="gioi-thieu" />} />
        <Route path="dieu-khoan-su-dung" element={<StaticPage fixedSlug="dieu-khoan-su-dung" />} />
        <Route path="chinh-sach-quyen-rieng-tu" element={<StaticPage fixedSlug="chinh-sach-quyen-rieng-tu" />} />
        <Route path="quy-dinh-dang-bai" element={<StaticPage fixedSlug="quy-dinh-dang-bai" />} />
        <Route path="dieu-khoan" element={<StaticPage fixedSlug="dieu-khoan-su-dung" />} />
        <Route path="chinh-sach-quyen-rieng" element={<StaticPage fixedSlug="chinh-sach-quyen-rieng-tu" />} />
        <Route path="tu-van" element={<LeadPage />} />

        <Route path="dang-nhap" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="dang-ky" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="quen-mat-khau" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="dat-lai-mat-khau/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        <Route path="xac-thuc-email" element={<Protected><VerifyEmailPage /></Protected>} />
        <Route path="xac-thuc-so-dien-thoai" element={<Protected><VerifyPhonePage /></Protected>} />
        <Route path="dang-bai" element={<Protected><CreateHubPage /></Protected>} />

        <Route
          path="studio/cong-dong"
          element={<Protected><ContentStudioEntryPage contentType="community" /></Protected>}
        />
        <Route
          path="studio/cong-dong/:editorId"
          element={<Protected><CommunityStudioPage /></Protected>}
        />
        <Route
          path="studio/bat-dong-san"
          element={<Protected><ContentStudioEntryPage contentType="property" /></Protected>}
        />
        <Route
          path="studio/bat-dong-san/:editorId"
          element={<Protected><PropertyStudioAdapter /></Protected>}
        />
        <Route
          path="studio/viec-lam"
          element={<Protected><ContentStudioEntryPage contentType="job" /></Protected>}
        />
        <Route
          path="studio/viec-lam/:editorId"
          element={<Protected><JobStudioPage /></Protected>}
        />

        <Route path="dang-bai/cong-dong" element={<Protected><LegacyStudioRedirect type="community" /></Protected>} />
        <Route path="dang-bai/cong-dong/:editorId" element={<Protected><LegacyStudioRedirect type="community" /></Protected>} />
        <Route path="dang-bai/nha-dat" element={<Protected><LegacyStudioRedirect type="property" /></Protected>} />
        <Route path="dang-bai/nha-dat/:editorId" element={<Protected><LegacyStudioRedirect type="property" /></Protected>} />
        <Route path="dang-bai/viec-lam" element={<Protected><LegacyStudioRedirect type="job" /></Protected>} />
        <Route path="dang-bai/viec-lam/:editorId" element={<Protected><LegacyStudioRedirect type="job" /></Protected>} />

        <Route
          path="gui-tin"
          element={
            <ProtectedEditor basePath="/gui-tin" sessionPrefix="news-tip">
              <NewsTipPage />
            </ProtectedEditor>
          }
        />
        <Route
          path="gui-tin/:editorId"
          element={
            <ProtectedEditor basePath="/gui-tin" sessionPrefix="news-tip">
              <NewsTipPage />
            </ProtectedEditor>
          }
        />

        <Route path="tai-khoan" element={<Protected><AccountLayout /></Protected>}>
          <Route index element={<AccountOverviewPage />} />
          <Route path="ho-so" element={<ProfileSettingsPage />} />
          <Route path="bao-mat" element={<SecurityPage />} />
          <Route path="phien-dang-nhap" element={<SessionsPage />} />
          <Route path="thong-bao" element={<NotificationsPage />} />
          <Route path="noi-dung" element={<MyContentPage />} />
          <Route path="bai-viet" element={<Navigate to="/tai-khoan/noi-dung" replace />} />
          <Route path="tin-nha-dat" element={<Navigate to="/tai-khoan/noi-dung?type=property" replace />} />
          <Route path="da-luu" element={<BookmarksPage />} />
          <Route path="bao-cao" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>,
  ),
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TaxonomyProvider>
          <Suspense fallback={<PageLoading />}>
            <RouterProvider router={router} />
          </Suspense>
        </TaxonomyProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
