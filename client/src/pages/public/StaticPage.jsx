import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronUp,
  ClipboardCheck,
  Copy,
  FileText,
  Info,
  LockKeyhole,
  Printer,
  ScrollText,
  Share2,
  ShieldCheck,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleBody from '../../components/content/ArticleBody';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { systemApi } from '../../api/content.api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

import './StaticPage.css';

const DEFAULT_UPDATED_AT =
  '2026-07-16T00:00:00.000Z';

const fallbacks = {
  'gioi-thieu': {
    title: 'Giới thiệu Đô Thị Hòa Lạc',

    description:
      'Đô Thị Hòa Lạc là nền tảng thông tin, cộng đồng và kết nối nhu cầu địa phương tại khu vực Hòa Lạc.',

    updatedAt: DEFAULT_UPDATED_AT,

    body: `
      <p>
        <strong>Đô Thị Hòa Lạc</strong> là nền tảng thông tin và cộng đồng
        địa phương, được phát triển bởi <strong>Media Space</strong> thuộc
        hệ sinh thái <strong>XSpace</strong>.
      </p>

      <p>
        Nền tảng được xây dựng với mục tiêu tập hợp, tổ chức và trình bày
        các thông tin liên quan đến Hòa Lạc theo cách rõ ràng, dễ tìm kiếm
        và có giá trị sử dụng thực tế đối với người dân, doanh nghiệp,
        nhà đầu tư, người lao động, sinh viên và những người đang quan tâm
        đến khu vực.
      </p>

      <h2>Sứ mệnh của Đô Thị Hòa Lạc</h2>

      <p>
        Đô Thị Hòa Lạc hướng tới việc trở thành một điểm truy cập thông tin
        địa phương đáng tin cậy, nơi người dùng có thể theo dõi những thay đổi
        của khu vực, tìm kiếm cơ hội và kết nối với các nhu cầu thực tế trong
        đời sống.
      </p>

      <p>
        Chúng tôi tập trung vào ba nhiệm vụ chính:
      </p>

      <ul>
        <li>
          Tổ chức thông tin về quy hoạch, hạ tầng, dự án và phát triển đô thị
          tại Hòa Lạc.
        </li>

        <li>
          Xây dựng không gian cộng đồng để người dân cùng hỏi đáp, thảo luận,
          phản ánh và chia sẻ thông tin địa phương.
        </li>

        <li>
          Kết nối các nhu cầu thực tế như bất động sản, việc làm, thuê nhà,
          dịch vụ, xây dựng, kiến trúc và nghỉ dưỡng.
        </li>
      </ul>

      <h2>Các nhóm nội dung chính</h2>

      <h3>Thông tin quy hoạch và hạ tầng</h3>

      <p>
        Cập nhật các thông tin liên quan đến định hướng phát triển đô thị,
        giao thông, hạ tầng kỹ thuật, dự án đầu tư xây dựng và những thay đổi
        có thể ảnh hưởng đến đời sống, hoạt động kinh doanh hoặc quyết định
        đầu tư tại Hòa Lạc.
      </p>

      <h3>Tin tức địa phương</h3>

      <p>
        Tổng hợp và biên tập các nội dung về đời sống, giáo dục, công nghệ,
        môi trường, sự kiện, thông báo và hoạt động của các tổ chức, đơn vị
        trong khu vực.
      </p>

      <h3>Bất động sản Hòa Lạc</h3>

      <p>
        Cung cấp không gian đăng và tìm kiếm thông tin mua bán, chuyển nhượng,
        cho thuê nhà đất, căn hộ, mặt bằng, phòng trọ và các loại hình bất động
        sản khác.
      </p>

      <p>
        Đô Thị Hòa Lạc đóng vai trò là nền tảng cung cấp và kết nối thông tin,
        không trực tiếp đại diện cho bên mua, bên bán hoặc tham gia vào quá
        trình giao dịch.
      </p>

      <h3>Việc làm và tuyển dụng</h3>

      <p>
        Kết nối doanh nghiệp, người lao động, sinh viên và người đang tìm kiếm
        cơ hội nghề nghiệp tại Hòa Lạc thông qua các tin tuyển dụng, việc làm
        thời vụ, thực tập và cộng tác viên.
      </p>

      <h3>Cộng đồng Hòa Lạc</h3>

      <p>
        Tạo không gian để thành viên đặt câu hỏi, chia sẻ kinh nghiệm, phản ánh
        vấn đề, giới thiệu hoạt động và thảo luận về những chủ đề liên quan đến
        khu vực.
      </p>

      <h2>Đối tượng phục vụ</h2>

      <p>
        Đô Thị Hòa Lạc được xây dựng để phục vụ nhiều nhóm người dùng khác nhau:
      </p>

      <ul>
        <li>
          Người dân đang sinh sống tại Hòa Lạc và các khu vực lân cận.
        </li>

        <li>
          Người đang có kế hoạch chuyển đến sinh sống, học tập hoặc làm việc.
        </li>

        <li>
          Doanh nghiệp, cửa hàng, đơn vị dịch vụ và nhà tuyển dụng.
        </li>

        <li>
          Nhà đầu tư và người đang tìm hiểu thị trường bất động sản.
        </li>

        <li>
          Sinh viên, người lao động và chuyên gia làm việc trong khu vực.
        </li>

        <li>
          Người có nhu cầu xây dựng, thiết kế kiến trúc hoặc tìm kiếm nơi lưu trú.
        </li>
      </ul>

      <h2>Nguyên tắc hoạt động</h2>

      <h3>Rõ ràng và có cấu trúc</h3>

      <p>
        Nội dung được phân loại theo chuyên mục, khu vực và nhu cầu sử dụng
        nhằm giúp người đọc dễ dàng tìm kiếm và theo dõi.
      </p>

      <h3>Tôn trọng tính xác thực</h3>

      <p>
        Chúng tôi khuyến khích người dùng cung cấp thông tin chính xác, có
        nguồn tham khảo và chủ động cập nhật khi nội dung có thay đổi.
      </p>

      <h3>Tôn trọng cộng đồng</h3>

      <p>
        Mọi thành viên cần trao đổi văn minh, không xúc phạm, kỳ thị, đe dọa
        hoặc xâm phạm quyền và lợi ích hợp pháp của người khác.
      </p>

      <h3>Minh bạch giữa nội dung và quảng cáo</h3>

      <p>
        Nội dung quảng cáo, tài trợ hoặc hợp tác thương mại cần được nhận diện
        phù hợp, tránh gây nhầm lẫn với nội dung biên tập độc lập.
      </p>

      <h2>Hệ sinh thái XSpace</h2>

      <p>
        Đô Thị Hòa Lạc là một phần trong hệ sinh thái XSpace, kết nối với các
        thương hiệu và dịch vụ liên quan đến truyền thông, kiến trúc, xây dựng,
        bất động sản và lưu trú.
      </p>

      <p>
        Một số nhu cầu có thể được chuyển tiếp đến đơn vị phù hợp trong hệ sinh
        thái khi người dùng chủ động gửi yêu cầu tư vấn và đồng ý cung cấp
        thông tin liên hệ.
      </p>

      <h2>Thông tin liên hệ</h2>

      <p>
        Người dùng có thể liên hệ với Đô Thị Hòa Lạc để phản hồi nội dung,
        yêu cầu hỗ trợ, đề nghị hợp tác hoặc thông báo về thông tin cần điều chỉnh.
      </p>

      <ul>
        <li>
          <strong>Website:</strong> dothihoalac.vn
        </li>

        <li>
          <strong>Hotline:</strong> 0966 709 790
        </li>

        <li>
          <strong>Email:</strong> admin@xspace.vn
        </li>
      </ul>

      <p>
        Chúng tôi trân trọng mọi đóng góp có trách nhiệm nhằm xây dựng một nền
        tảng thông tin hữu ích, văn minh và gắn với sự phát triển của Hòa Lạc.
      </p>
    `,
  },

  'dieu-khoan-su-dung': {
    title: 'Điều khoản sử dụng',

    description:
      'Quy định về quyền, nghĩa vụ và trách nhiệm của người dùng khi truy cập, đăng tải nội dung và sử dụng dịch vụ trên Đô Thị Hòa Lạc.',

    updatedAt: DEFAULT_UPDATED_AT,

    body: `
      <p>
        Điều khoản sử dụng này quy định việc truy cập và sử dụng website
        <strong>Đô Thị Hòa Lạc</strong>, bao gồm các chức năng đọc tin,
        đăng bài, bình luận, tương tác, đăng tin bất động sản, đăng tin
        tuyển dụng và gửi yêu cầu tư vấn.
      </p>

      <p>
        Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ chức năng nào
        trên nền tảng, người dùng được hiểu là đã đọc, hiểu và đồng ý tuân
        thủ các điều khoản dưới đây.
      </p>

      <h2>1. Phạm vi cung cấp dịch vụ</h2>

      <p>
        Đô Thị Hòa Lạc cung cấp nền tảng để người dùng tiếp cận, đăng tải
        và trao đổi các thông tin liên quan đến khu vực Hòa Lạc.
      </p>

      <p>
        Các nhóm dịch vụ chính có thể bao gồm:
      </p>

      <ul>
        <li>
          Đọc và tìm kiếm tin tức, bài viết và thông tin địa phương.
        </li>

        <li>
          Đăng bài cộng đồng, bình luận và bày tỏ cảm xúc.
        </li>

        <li>
          Đăng và tìm kiếm thông tin bất động sản.
        </li>

        <li>
          Đăng và tìm kiếm thông tin việc làm.
        </li>

        <li>
          Gửi yêu cầu tư vấn về kiến trúc, xây dựng, lưu trú hoặc dịch vụ
          liên quan.
        </li>

        <li>
          Nhận thông báo liên quan đến tài khoản và nội dung đã đăng.
        </li>
      </ul>

      <h2>2. Tài khoản người dùng</h2>

      <p>
        Người dùng có thể phải đăng ký tài khoản để sử dụng một số chức năng
        của nền tảng. Khi đăng ký, người dùng có trách nhiệm cung cấp thông tin
        phù hợp và bảo vệ thông tin đăng nhập của mình.
      </p>

      <p>
        Người dùng không được:
      </p>

      <ul>
        <li>
          Tạo tài khoản nhằm giả mạo cá nhân, tổ chức hoặc doanh nghiệp khác.
        </li>

        <li>
          Chuyển giao tài khoản cho người khác sử dụng vào mục đích vi phạm.
        </li>

        <li>
          Sử dụng công cụ tự động để tạo hàng loạt tài khoản hoặc nội dung rác.
        </li>

        <li>
          Truy cập trái phép vào tài khoản hoặc dữ liệu của người dùng khác.
        </li>
      </ul>

      <p>
        Người dùng cần thông báo cho nền tảng khi phát hiện tài khoản của mình
        có dấu hiệu bị truy cập trái phép.
      </p>

      <h2>3. Trách nhiệm đối với nội dung đăng tải</h2>

      <p>
        Người dùng chịu trách nhiệm đối với tiêu đề, hình ảnh, văn bản,
        thông tin liên hệ, đường dẫn và mọi dữ liệu do mình đăng tải.
      </p>

      <p>
        Nội dung phải bảo đảm:
      </p>

      <ul>
        <li>Không vi phạm pháp luật.</li>

        <li>
          Không xâm phạm quyền riêng tư hoặc quyền sở hữu trí tuệ.
        </li>

        <li>
          Không giả mạo cá nhân, tổ chức hoặc cơ quan nhà nước.
        </li>

        <li>
          Không chứa thông tin lừa đảo hoặc gây hiểu nhầm nghiêm trọng.
        </li>

        <li>
          Không sử dụng nền tảng để phát tán mã độc, liên kết nguy hiểm hoặc
          nội dung rác.
        </li>
      </ul>

      <h2>4. Nội dung bất động sản</h2>

      <p>
        Người đăng tin bất động sản cần cung cấp thông tin trung thực về loại
        bất động sản, vị trí, diện tích, giá, pháp lý, tình trạng giao dịch
        và thông tin liên hệ.
      </p>

      <p>
        Đô Thị Hòa Lạc không phải là bên mua, bên bán, bên cho thuê, bên môi
        giới hoặc bên bảo lãnh trong giao dịch, trừ khi có thông báo bằng văn
        bản cho một dịch vụ cụ thể.
      </p>

      <p>
        Người dùng cần tự kiểm tra:
      </p>

      <ul>
        <li>
          Giấy tờ pháp lý và quyền sở hữu hoặc quyền sử dụng tài sản.
        </li>

        <li>
          Thông tin quy hoạch và hiện trạng thực tế.
        </li>

        <li>
          Danh tính và quyền đại diện của người đăng.
        </li>

        <li>
          Nội dung hợp đồng, đặt cọc và nghĩa vụ tài chính.
        </li>
      </ul>

      <h2>5. Nội dung việc làm</h2>

      <p>
        Nhà tuyển dụng có trách nhiệm cung cấp thông tin rõ ràng về vị trí
        tuyển dụng, địa điểm, mô tả công việc, mức lương, thời gian làm việc
        và cách thức ứng tuyển.
      </p>

      <p>
        Không được sử dụng nền tảng để tuyển dụng cho hoạt động bất hợp pháp,
        yêu cầu ứng viên chuyển tiền trái quy định hoặc thu thập thông tin cá
        nhân không cần thiết.
      </p>

      <p>
        Ứng viên cần xác minh doanh nghiệp trước khi gửi giấy tờ quan trọng,
        chuyển tiền hoặc tham gia các quy trình tuyển dụng bên ngoài nền tảng.
      </p>

      <h2>6. Bình luận và hoạt động cộng đồng</h2>

      <p>
        Người dùng cần trao đổi trên tinh thần tôn trọng, tập trung vào nội
        dung và không kích động xung đột.
      </p>

      <p>
        Không được đăng bình luận có nội dung:
      </p>

      <ul>
        <li>
          Xúc phạm, đe dọa hoặc quấy rối người khác.
        </li>

        <li>
          Kỳ thị vùng miền, giới tính, dân tộc hoặc đặc điểm cá nhân.
        </li>

        <li>
          Công khai trái phép số điện thoại, địa chỉ hoặc dữ liệu cá nhân
          của người khác.
        </li>

        <li>
          Lặp lại nội dung quảng cáo, đường dẫn hoặc tin nhắn không liên quan.
        </li>
      </ul>

      <h2>7. Quyền kiểm duyệt của nền tảng</h2>

      <p>
        Đô Thị Hòa Lạc có quyền thực hiện một hoặc nhiều biện pháp sau khi
        phát hiện nội dung không phù hợp:
      </p>

      <ul>
        <li>
          Yêu cầu người đăng chỉnh sửa hoặc bổ sung thông tin.
        </li>

        <li>
          Tạm ẩn nội dung để kiểm tra.
        </li>

        <li>
          Từ chối xuất bản hoặc gỡ bỏ nội dung.
        </li>

        <li>
          Hạn chế một số chức năng của tài khoản.
        </li>

        <li>
          Tạm khóa hoặc chấm dứt tài khoản vi phạm nghiêm trọng hoặc lặp lại
          nhiều lần.
        </li>
      </ul>

      <p>
        Việc kiểm duyệt không đồng nghĩa với việc nền tảng xác nhận tuyệt đối
        tính chính xác của mọi nội dung đã được xuất bản.
      </p>

      <h2>8. Quyền sở hữu trí tuệ</h2>

      <p>
        Người dùng chỉ được đăng tải nội dung mà mình có quyền sử dụng hoặc
        đã được chủ sở hữu cho phép.
      </p>

      <p>
        Khi đăng nội dung lên nền tảng, người dùng cho phép Đô Thị Hòa Lạc
        lưu trữ, hiển thị, định dạng lại và phân phối nội dung trong phạm vi
        cần thiết để vận hành dịch vụ.
      </p>

      <p>
        Việc này không làm chuyển quyền sở hữu nội dung từ người dùng sang
        nền tảng.
      </p>

      <h2>9. Liên kết và dịch vụ của bên thứ ba</h2>

      <p>
        Nền tảng có thể chứa liên kết đến website, bản đồ, mạng xã hội hoặc
        dịch vụ của bên thứ ba. Đô Thị Hòa Lạc không kiểm soát toàn bộ nội
        dung hoặc chính sách của các dịch vụ đó.
      </p>

      <p>
        Người dùng cần tự xem xét điều khoản và chính sách của bên thứ ba
        trước khi sử dụng.
      </p>

      <h2>10. Giới hạn trách nhiệm</h2>

      <p>
        Đô Thị Hòa Lạc cố gắng duy trì hoạt động ổn định và cung cấp thông
        tin hữu ích nhưng không bảo đảm rằng mọi nội dung luôn đầy đủ, chính
        xác hoặc cập nhật tại mọi thời điểm.
      </p>

      <p>
        Nền tảng không chịu trách nhiệm thay cho người đăng hoặc các bên tham
        gia giao dịch, tuyển dụng, hợp tác hoặc thỏa thuận phát sinh từ thông
        tin được đăng tải.
      </p>

      <h2>11. Tạm ngừng hoặc thay đổi dịch vụ</h2>

      <p>
        Một số chức năng có thể được bảo trì, thay đổi, bổ sung hoặc ngừng
        cung cấp để phù hợp với hoạt động thực tế, yêu cầu kỹ thuật hoặc quy
        định pháp luật.
      </p>

      <h2>12. Thay đổi điều khoản</h2>

      <p>
        Điều khoản sử dụng có thể được cập nhật. Phiên bản mới có hiệu lực
        kể từ thời điểm được công bố trên nền tảng, trừ khi có thông báo khác.
      </p>

      <h2>13. Liên hệ</h2>

      <p>
        Các câu hỏi hoặc phản hồi liên quan đến điều khoản sử dụng có thể
        được gửi qua:
      </p>

      <ul>
        <li>
          <strong>Email:</strong> admin@xspace.vn
        </li>

        <li>
          <strong>Hotline:</strong> 0966 709 790
        </li>
      </ul>
    `,
  },

  'chinh-sach-quyen-rieng-tu': {
    title: 'Chính sách quyền riêng tư',

    description:
      'Thông tin về loại dữ liệu được thu thập, mục đích sử dụng, thời gian lưu trữ và quyền của người dùng trên Đô Thị Hòa Lạc.',

    updatedAt: DEFAULT_UPDATED_AT,

    body: `
      <p>
        Chính sách quyền riêng tư này mô tả cách
        <strong>Đô Thị Hòa Lạc</strong> thu thập, sử dụng, lưu trữ và bảo vệ
        dữ liệu trong quá trình người dùng truy cập và sử dụng nền tảng.
      </p>

      <p>
        Chúng tôi hướng tới việc chỉ thu thập những dữ liệu cần thiết cho
        hoạt động của hệ thống và các yêu cầu mà người dùng chủ động thực hiện.
      </p>

      <h2>1. Phạm vi áp dụng</h2>

      <p>
        Chính sách này áp dụng đối với dữ liệu được xử lý khi người dùng:
      </p>

      <ul>
        <li>
          Truy cập website Đô Thị Hòa Lạc.
        </li>

        <li>
          Đăng ký hoặc sử dụng tài khoản.
        </li>

        <li>
          Đăng bài, bình luận hoặc tương tác với nội dung.
        </li>

        <li>
          Đăng tin bất động sản hoặc việc làm.
        </li>

        <li>
          Gửi yêu cầu tư vấn, liên hệ hoặc phản hồi.
        </li>

        <li>
          Sử dụng các chức năng khác được cung cấp trên nền tảng.
        </li>
      </ul>

      <h2>2. Dữ liệu có thể được thu thập</h2>

      <h3>Thông tin tài khoản</h3>

      <p>
        Bao gồm tên hiển thị, tên đăng nhập, địa chỉ email, số điện thoại,
        ảnh đại diện, trạng thái xác minh và thông tin hồ sơ mà người dùng
        chủ động cung cấp.
      </p>

      <h3>Thông tin nội dung</h3>

      <p>
        Bao gồm bài viết, tin đăng, hình ảnh, bình luận, phản hồi, thông tin
        liên hệ, khu vực, chuyên mục và các dữ liệu liên quan đến nội dung
        người dùng đăng tải.
      </p>

      <h3>Thông tin yêu cầu tư vấn</h3>

      <p>
        Khi người dùng gửi biểu mẫu tư vấn, hệ thống có thể thu thập họ tên,
        số điện thoại, email, nội dung nhu cầu, loại dịch vụ quan tâm và nguồn
        nội dung dẫn đến biểu mẫu.
      </p>

      <h3>Dữ liệu kỹ thuật</h3>

      <p>
        Hệ thống có thể ghi nhận địa chỉ IP, loại trình duyệt, loại thiết bị,
        thời gian truy cập, trang được xem, lỗi hệ thống và một số dữ liệu kỹ
        thuật cần thiết để bảo mật và vận hành.
      </p>

      <h3>Dữ liệu tương tác</h3>

      <p>
        Bao gồm lượt xem, cảm xúc, bình luận, nội dung đã lưu, lịch sử gửi
        yêu cầu và các hoạt động liên quan đến việc sử dụng nền tảng.
      </p>

      <h2>3. Mục đích sử dụng dữ liệu</h2>

      <p>
        Dữ liệu có thể được sử dụng để:
      </p>

      <ul>
        <li>
          Tạo, quản lý và bảo vệ tài khoản người dùng.
        </li>

        <li>
          Hiển thị, phân loại và phân phối nội dung trên nền tảng.
        </li>

        <li>
          Xử lý yêu cầu đăng bài, kiểm duyệt và phản hồi vi phạm.
        </li>

        <li>
          Cung cấp chức năng bình luận, thông báo và tương tác.
        </li>

        <li>
          Xử lý yêu cầu tư vấn hoặc liên hệ do người dùng chủ động gửi.
        </li>

        <li>
          Phòng chống gian lận, spam, lạm dụng tài khoản và truy cập trái phép.
        </li>

        <li>
          Phân tích hiệu quả vận hành và cải thiện trải nghiệm người dùng.
        </li>

        <li>
          Thực hiện nghĩa vụ theo yêu cầu hợp pháp của cơ quan có thẩm quyền.
        </li>
      </ul>

      <h2>4. Cơ sở xử lý thông tin</h2>

      <p>
        Dữ liệu được xử lý dựa trên một hoặc nhiều cơ sở sau:
      </p>

      <ul>
        <li>
          Người dùng chủ động cung cấp và đồng ý sử dụng chức năng tương ứng.
        </li>

        <li>
          Việc xử lý cần thiết để cung cấp dịch vụ mà người dùng yêu cầu.
        </li>

        <li>
          Lợi ích hợp pháp trong việc bảo vệ hệ thống và ngăn chặn hành vi
          lạm dụng.
        </li>

        <li>
          Yêu cầu tuân thủ nghĩa vụ pháp lý.
        </li>
      </ul>

      <h2>5. Chia sẻ dữ liệu</h2>

      <p>
        Đô Thị Hòa Lạc không bán dữ liệu cá nhân của người dùng.
      </p>

      <p>
        Dữ liệu có thể được chia sẻ trong các trường hợp cần thiết sau:
      </p>

      <ul>
        <li>
          Với nhà cung cấp hạ tầng, lưu trữ, email, phân tích hoặc dịch vụ kỹ
          thuật phục vụ cho hoạt động của nền tảng.
        </li>

        <li>
          Với đơn vị trong hệ sinh thái XSpace khi người dùng chủ động gửi
          yêu cầu tư vấn phù hợp với dịch vụ của đơn vị đó.
        </li>

        <li>
          Với cơ quan có thẩm quyền khi có yêu cầu hợp pháp.
        </li>

        <li>
          Khi cần bảo vệ quyền, tài sản hoặc sự an toàn của người dùng và
          nền tảng.
        </li>
      </ul>

      <h2>6. Thông tin công khai</h2>

      <p>
        Một số dữ liệu do người dùng đăng có thể được hiển thị công khai,
        chẳng hạn:
      </p>

      <ul>
        <li>
          Tên hiển thị và ảnh đại diện.
        </li>

        <li>
          Bài viết, bình luận và nội dung cộng đồng.
        </li>

        <li>
          Thông tin liên hệ được đưa vào tin bất động sản hoặc tin tuyển dụng.
        </li>

        <li>
          Khu vực, giá, diện tích và các thông tin mô tả trong tin đăng.
        </li>
      </ul>

      <p>
        Người dùng không nên đăng công khai căn cước, tài khoản ngân hàng,
        mật khẩu, mã xác thực hoặc dữ liệu nhạy cảm không cần thiết.
      </p>

      <h2>7. Cookie và công nghệ tương tự</h2>

      <p>
        Nền tảng có thể sử dụng cookie hoặc bộ nhớ trình duyệt để duy trì
        đăng nhập, lưu lựa chọn giao diện, bảo vệ phiên truy cập và cải thiện
        trải nghiệm sử dụng.
      </p>

      <p>
        Người dùng có thể quản lý cookie thông qua cài đặt của trình duyệt.
        Việc vô hiệu hóa một số cookie có thể làm ảnh hưởng đến chức năng
        của website.
      </p>

      <h2>8. Thời gian lưu trữ</h2>

      <p>
        Dữ liệu được lưu trong thời gian cần thiết để cung cấp dịch vụ, thực
        hiện nghĩa vụ pháp lý, giải quyết tranh chấp và bảo vệ hệ thống.
      </p>

      <p>
        Một số dữ liệu có thể tiếp tục được lưu trong bản sao lưu hoặc nhật
        ký kỹ thuật trong một khoảng thời gian hợp lý sau khi nội dung hoặc
        tài khoản bị xóa.
      </p>

      <h2>9. Bảo mật dữ liệu</h2>

      <p>
        Chúng tôi áp dụng các biện pháp kỹ thuật và quản lý phù hợp nhằm giảm
        nguy cơ truy cập, sửa đổi, tiết lộ hoặc phá hủy dữ liệu trái phép.
      </p>

      <p>
        Tuy nhiên, không có phương thức truyền hoặc lưu trữ dữ liệu trên
        Internet nào có thể bảo đảm an toàn tuyệt đối. Người dùng cần chủ động
        bảo vệ mật khẩu và thiết bị của mình.
      </p>

      <h2>10. Quyền của người dùng</h2>

      <p>
        Tùy thuộc vào loại dữ liệu và quy định áp dụng, người dùng có thể:
      </p>

      <ul>
        <li>
          Truy cập và cập nhật thông tin hồ sơ.
        </li>

        <li>
          Chỉnh sửa hoặc xóa nội dung do mình đăng khi chức năng cho phép.
        </li>

        <li>
          Yêu cầu điều chỉnh thông tin không chính xác.
        </li>

        <li>
          Yêu cầu hỗ trợ xóa tài khoản hoặc dữ liệu phù hợp.
        </li>

        <li>
          Rút lại yêu cầu tư vấn hoặc đề nghị ngừng liên hệ tiếp thị.
        </li>

        <li>
          Gửi phản ánh về việc sử dụng dữ liệu không phù hợp.
        </li>
      </ul>

      <h2>11. Dữ liệu của trẻ em</h2>

      <p>
        Nền tảng không chủ đích thu thập dữ liệu của trẻ em khi chưa có sự
        đồng ý hoặc giám sát phù hợp của cha mẹ, người giám hộ theo quy định.
      </p>

      <h2>12. Liên kết bên ngoài</h2>

      <p>
        Chính sách này không áp dụng cho website hoặc dịch vụ của bên thứ ba
        được liên kết từ Đô Thị Hòa Lạc. Người dùng cần đọc chính sách riêng
        tư của từng đơn vị trước khi sử dụng.
      </p>

      <h2>13. Thay đổi chính sách</h2>

      <p>
        Chính sách quyền riêng tư có thể được cập nhật để phù hợp với chức
        năng mới, hoạt động thực tế hoặc yêu cầu pháp luật.
      </p>

      <p>
        Phiên bản đang được công bố trên nền tảng là phiên bản được áp dụng
        tại thời điểm truy cập.
      </p>

      <h2>14. Liên hệ về dữ liệu cá nhân</h2>

      <p>
        Người dùng có thể gửi yêu cầu liên quan đến dữ liệu và quyền riêng tư qua:
      </p>

      <ul>
        <li>
          <strong>Email:</strong> admin@xspace.vn
        </li>

        <li>
          <strong>Hotline:</strong> 0966 709 790
        </li>
      </ul>

      <p>
        Khi gửi yêu cầu, người dùng cần cung cấp đủ thông tin để chúng tôi xác
        minh tài khoản hoặc nội dung liên quan trước khi xử lý.
      </p>
    `,
  },

  'quy-dinh-dang-bai': {
    title: 'Quy định đăng bài',

    description:
      'Nguyên tắc áp dụng đối với bài viết, bài cộng đồng, tin bất động sản, tin tuyển dụng, hình ảnh và bình luận trên Đô Thị Hòa Lạc.',

    updatedAt: DEFAULT_UPDATED_AT,

    body: `
      <p>
        Quy định đăng bài được xây dựng nhằm bảo đảm nội dung trên
        <strong>Đô Thị Hòa Lạc</strong> rõ ràng, hữu ích, đúng chuyên mục
        và hạn chế các hành vi lừa đảo, spam hoặc gây ảnh hưởng đến cộng đồng.
      </p>

      <p>
        Khi gửi nội dung, người đăng được hiểu là đã đọc và đồng ý tuân thủ
        các quy định dưới đây.
      </p>

      <h2>1. Nguyên tắc chung</h2>

      <p>
        Nội dung đăng tải cần đáp ứng các nguyên tắc sau:
      </p>

      <ul>
        <li>
          Tiêu đề phản ánh đúng nội dung.
        </li>

        <li>
          Thông tin rõ ràng, có đủ ngữ cảnh và không cố tình gây hiểu nhầm.
        </li>

        <li>
          Chọn đúng loại bài, chuyên mục và khu vực liên quan.
        </li>

        <li>
          Sử dụng tiếng Việt dễ hiểu, hạn chế viết hoa toàn bộ hoặc lạm dụng
          ký tự.
        </li>

        <li>
          Không sao chép nội dung của người khác khi chưa được phép.
        </li>

        <li>
          Không đăng lặp lại cùng một nội dung trong thời gian ngắn.
        </li>
      </ul>

      <h2>2. Nội dung bị cấm</h2>

      <p>
        Không được đăng nội dung:
      </p>

      <ul>
        <li>
          Vi phạm pháp luật hoặc hướng dẫn thực hiện hành vi vi phạm.
        </li>

        <li>
          Lừa đảo, giả mạo hoặc cung cấp thông tin sai sự thật có chủ đích.
        </li>

        <li>
          Xúc phạm danh dự, nhân phẩm hoặc đe dọa người khác.
        </li>

        <li>
          Kỳ thị dân tộc, vùng miền, giới tính, tôn giáo hoặc đặc điểm cá nhân.
        </li>

        <li>
          Tiết lộ trái phép thông tin cá nhân, số giấy tờ hoặc địa chỉ riêng tư.
        </li>

        <li>
          Vi phạm bản quyền, nhãn hiệu hoặc quyền sở hữu trí tuệ.
        </li>

        <li>
          Chứa phần mềm độc hại, đường dẫn nguy hiểm hoặc hình thức lừa lấy
          thông tin.
        </li>

        <li>
          Quảng cáo rác, nội dung đa cấp hoặc hình thức kêu gọi tài chính
          không minh bạch.
        </li>
      </ul>

      <h2>3. Quy định đối với bài cộng đồng</h2>

      <h3>Bài hỏi đáp</h3>

      <p>
        Cần mô tả rõ vấn đề, khu vực liên quan và thông tin cần được cộng đồng
        hỗ trợ. Không sử dụng tiêu đề chung chung như “giúp tôi”, “cần gấp”
        mà không có nội dung cụ thể.
      </p>

      <h3>Bài thảo luận</h3>

      <p>
        Cần trình bày quan điểm trên tinh thần xây dựng, không kích động tranh
        cãi hoặc công kích cá nhân.
      </p>

      <h3>Bài phản ánh</h3>

      <p>
        Cần nêu thời gian, địa điểm, sự việc và bằng chứng phù hợp. Không kết
        luận cá nhân hoặc tổ chức vi phạm khi chưa có căn cứ rõ ràng.
      </p>

      <h3>Bài chia sẻ</h3>

      <p>
        Nội dung cần có giá trị tham khảo đối với cộng đồng, không biến bài
        chia sẻ thành quảng cáo trá hình.
      </p>

      <h2>4. Quy định đối với tin bất động sản</h2>

      <p>
        Tin bất động sản cần có các thông tin cơ bản:
      </p>

      <ul>
        <li>
          Hình thức giao dịch: bán, cho thuê, sang nhượng hoặc nhu cầu tìm mua.
        </li>

        <li>
          Loại bất động sản.
        </li>

        <li>
          Khu vực và mô tả vị trí phù hợp.
        </li>

        <li>
          Diện tích, mức giá và đơn vị tính.
        </li>

        <li>
          Tình trạng pháp lý theo thông tin người đăng biết được.
        </li>

        <li>
          Thông tin liên hệ hợp lệ.
        </li>
      </ul>

      <p>
        Người đăng không được:
      </p>

      <ul>
        <li>
          Đăng bất động sản không có quyền đại diện hoặc không được chủ sở
          hữu cho phép.
        </li>

        <li>
          Sử dụng mức giá giả để thu hút người xem.
        </li>

        <li>
          Đăng sai vị trí hoặc gắn khu vực không liên quan.
        </li>

        <li>
          Dùng hình ảnh của bất động sản khác mà không ghi chú.
        </li>

        <li>
          Tuyên bố chắc chắn về quy hoạch, pháp lý hoặc lợi nhuận khi chưa
          có căn cứ.
        </li>

        <li>
          Đăng nhiều tin trùng lặp cho cùng một bất động sản.
        </li>
      </ul>

      <h3>Hình ảnh bất động sản</h3>

      <p>
        Hình ảnh nên phản ánh đúng hiện trạng, đủ sáng và không chứa số điện
        thoại chèn quá lớn làm ảnh hưởng trải nghiệm người xem.
      </p>

      <p>
        Hình ảnh bản đồ, giấy tờ hoặc hồ sơ cần che thông tin cá nhân nhạy cảm
        trước khi đăng.
      </p>

      <h2>5. Quy định đối với tin tuyển dụng</h2>

      <p>
        Tin tuyển dụng cần có:
      </p>

      <ul>
        <li>
          Tên vị trí tuyển dụng.
        </li>

        <li>
          Tên doanh nghiệp hoặc đơn vị tuyển dụng.
        </li>

        <li>
          Địa điểm làm việc.
        </li>

        <li>
          Loại công việc và thời gian làm việc.
        </li>

        <li>
          Mô tả công việc, yêu cầu và quyền lợi.
        </li>

        <li>
          Mức lương hoặc ghi rõ thỏa thuận.
        </li>

        <li>
          Cách thức ứng tuyển và thông tin liên hệ.
        </li>
      </ul>

      <p>
        Không được đăng tin:
      </p>

      <ul>
        <li>
          Yêu cầu ứng viên chuyển tiền hoặc đóng phí tuyển dụng bất hợp lý.
        </li>

        <li>
          Không nêu rõ công việc nhưng yêu cầu cung cấp giấy tờ cá nhân.
        </li>

        <li>
          Tuyển dụng cho hoạt động vi phạm pháp luật.
        </li>

        <li>
          Giả mạo thương hiệu hoặc doanh nghiệp khác.
        </li>

        <li>
          Cam kết thu nhập phi thực tế hoặc cố tình che giấu bản chất công việc.
        </li>
      </ul>

      <h2>6. Quy định đối với hình ảnh và tệp đính kèm</h2>

      <p>
        Hình ảnh cần:
      </p>

      <ul>
        <li>
          Có liên quan trực tiếp đến nội dung.
        </li>

        <li>
          Không chứa nội dung phản cảm hoặc vi phạm pháp luật.
        </li>

        <li>
          Không xâm phạm bản quyền.
        </li>

        <li>
          Không để lộ dữ liệu cá nhân không cần thiết.
        </li>

        <li>
          Không sử dụng ảnh giả nhằm đánh lừa người xem.
        </li>
      </ul>

      <p>
        Nền tảng có thể nén, đổi định dạng hoặc tạo ảnh thu nhỏ để tối ưu
        việc hiển thị.
      </p>

      <h2>7. Quy định đối với thông tin liên hệ</h2>

      <p>
        Số điện thoại, email và tên người liên hệ phải thuộc quyền sử dụng
        hợp pháp của người đăng.
      </p>

      <p>
        Không được đăng thông tin liên hệ của người khác nhằm quấy rối,
        giả mạo hoặc thu thập khách hàng trái phép.
      </p>

      <h2>8. Tiêu đề bài viết</h2>

      <p>
        Tiêu đề nên:
      </p>

      <ul>
        <li>
          Ngắn gọn nhưng đủ thông tin.
        </li>

        <li>
          Nêu đúng loại nội dung hoặc nhu cầu chính.
        </li>

        <li>
          Có địa điểm khi địa điểm là yếu tố quan trọng.
        </li>

        <li>
          Không lạm dụng từ như “sốc”, “duy nhất”, “cam kết lãi” hoặc
          “không thể bỏ qua”.
        </li>

        <li>
          Không viết toàn bộ bằng chữ in hoa.
        </li>
      </ul>

      <h2>9. Nội dung trùng lặp và spam</h2>

      <p>
        Nội dung được xem là spam khi người dùng đăng lặp lại nhiều lần,
        đăng sai chuyên mục, gửi bình luận quảng cáo hàng loạt hoặc sử dụng
        nhiều tài khoản để đẩy nội dung.
      </p>

      <p>
        Các bài có nội dung tương tự có thể được gộp, ẩn hoặc yêu cầu chỉnh sửa.
      </p>

      <h2>10. Nội dung quảng cáo và tài trợ</h2>

      <p>
        Nội dung mang tính quảng cáo cần thể hiện rõ đơn vị cung cấp, sản phẩm
        hoặc dịch vụ và không được giả dạng bài đánh giá độc lập.
      </p>

      <p>
        Bài viết tài trợ có thể được gắn nhãn để người đọc nhận biết.
      </p>

      <h2>11. Quy trình kiểm duyệt</h2>

      <p>
        Sau khi được gửi, nội dung có thể trải qua một hoặc nhiều bước:
      </p>

      <ol>
        <li>
          Kiểm tra tự động về dữ liệu bắt buộc, liên kết hoặc từ khóa rủi ro.
        </li>

        <li>
          Kiểm tra thủ công khi nội dung cần xác minh thêm.
        </li>

        <li>
          Yêu cầu người đăng chỉnh sửa hoặc bổ sung thông tin.
        </li>

        <li>
          Phê duyệt, từ chối hoặc tạm ẩn nội dung.
        </li>
      </ol>

      <p>
        Thời gian xử lý có thể thay đổi tùy loại nội dung, số lượng bài đang
        chờ và mức độ cần xác minh.
      </p>

      <h2>12. Các hình thức xử lý vi phạm</h2>

      <p>
        Tùy mức độ vi phạm, nền tảng có thể:
      </p>

      <ul>
        <li>
          Chỉnh sửa định dạng nhưng không làm thay đổi bản chất nội dung.
        </li>

        <li>
          Yêu cầu bổ sung hoặc sửa thông tin.
        </li>

        <li>
          Từ chối xuất bản.
        </li>

        <li>
          Ẩn hoặc gỡ bài đã đăng.
        </li>

        <li>
          Hạn chế quyền đăng bài hoặc bình luận.
        </li>

        <li>
          Tạm khóa hoặc khóa tài khoản.
        </li>

        <li>
          Chuyển thông tin đến cơ quan có thẩm quyền khi có yêu cầu hợp pháp.
        </li>
      </ul>

      <h2>13. Chỉnh sửa và gia hạn nội dung</h2>

      <p>
        Người dùng có thể chỉnh sửa nội dung thuộc quyền quản lý của mình
        khi chức năng cho phép. Nội dung sau chỉnh sửa có thể được đưa về
        trạng thái chờ duyệt.
      </p>

      <p>
        Tin bất động sản hoặc việc làm có thể có thời hạn hiển thị. Người
        đăng cần gia hạn hoặc cập nhật trạng thái khi giao dịch, tuyển dụng
        hoặc nhu cầu đã kết thúc.
      </p>

      <h2>14. Báo cáo nội dung</h2>

      <p>
        Thành viên có thể báo cáo bài viết, bình luận hoặc tin đăng có dấu
        hiệu vi phạm.
      </p>

      <p>
        Khi báo cáo, nên cung cấp lý do cụ thể và thông tin hỗ trợ để quá
        trình kiểm tra được chính xác hơn.
      </p>

      <h2>15. Trách nhiệm của người đăng</h2>

      <p>
        Việc bài đăng được phê duyệt không loại trừ trách nhiệm của người
        đăng đối với tính chính xác, nguồn gốc và tính hợp pháp của nội dung.
      </p>

      <p>
        Người đăng cần chủ động cập nhật hoặc gỡ nội dung khi thông tin
        không còn đúng.
      </p>

      <h2>16. Liên hệ hỗ trợ</h2>

      <p>
        Khi cần hỗ trợ về việc đăng bài, chỉnh sửa hoặc phản hồi quyết định
        kiểm duyệt, người dùng có thể liên hệ:
      </p>

      <ul>
        <li>
          <strong>Email:</strong> admin@xspace.vn
        </li>

        <li>
          <strong>Hotline:</strong> 0966 709 790
        </li>
      </ul>
    `,
  },
};

const PAGE_CONFIG = {
  'gioi-thieu': {
    eyebrow: 'Về chúng tôi',
    icon: Building2,
    theme: 'about',
  },

  'dieu-khoan-su-dung': {
    eyebrow: 'Thông tin pháp lý',
    icon: ScrollText,
    theme: 'terms',
  },

  'chinh-sach-quyen-rieng-tu': {
    eyebrow: 'Bảo vệ dữ liệu',
    icon: LockKeyhole,
    theme: 'privacy',
  },

  'quy-dinh-dang-bai': {
    eyebrow: 'Nguyên tắc nội dung',
    icon: ClipboardCheck,
    theme: 'posting',
  },
};

const DEFAULT_PAGE = {
  title: 'Thông tin',

  description:
    'Thông tin từ Đô Thị Hòa Lạc.',

  updatedAt: DEFAULT_UPDATED_AT,

  body: `
    <p>
      Nội dung đang được cập nhật.
    </p>
  `,
};

function normalizePage(result) {
  if (!result) {
    return DEFAULT_PAGE;
  }

  const resultBody =
    result.body?.bodyHtml ||
    result.body?.html ||
    result.body ||
    result.bodyHtml ||
    result.contentHtml ||
    result.content;

  return {
    ...DEFAULT_PAGE,
    ...result,

    title:
      result.title ||
      DEFAULT_PAGE.title,

    description:
      result.description ||
      result.summary ||
      DEFAULT_PAGE.description,

    updatedAt:
      result.updatedAt ||
      result.publishedAt ||
      DEFAULT_PAGE.updatedAt,

    body:
      typeof resultBody === 'string'
        ? resultBody
        : DEFAULT_PAGE.body,
  };
}

function createHeadingId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(
      /[^a-z0-9\s-]/g,
      '',
    )
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function prepareHtml(html) {
  if (
    !html ||
    typeof DOMParser === 'undefined'
  ) {
    return {
      html: html || '',
      headings: [],
    };
  }

  const parser =
    new DOMParser();

  const documentNode =
    parser.parseFromString(
      `
        <div id="static-page-content">
          ${html}
        </div>
      `,
      'text/html',
    );

  const root =
    documentNode.querySelector(
      '#static-page-content',
    );

  if (!root) {
    return {
      html,
      headings: [],
    };
  }

  const usedIds = new Map();
  const headings = [];

  root
    .querySelectorAll('h2, h3')
    .forEach(
      (heading, index) => {
        const title =
          heading.textContent
            ?.replace(/\s+/g, ' ')
            .trim();

        if (!title) {
          return;
        }

        const baseId =
          createHeadingId(title) ||
          `noi-dung-${index + 1}`;

        const count =
          usedIds.get(baseId) || 0;

        usedIds.set(
          baseId,
          count + 1,
        );

        const id = count
          ? `${baseId}-${count + 1}`
          : baseId;

        heading.id = id;

        headings.push({
          id,
          title,

          level:
            heading.tagName.toLowerCase() ===
            'h3'
              ? 3
              : 2,
        });
      },
    );

  return {
    html: root.innerHTML,
    headings,
  };
}

async function copyText(value) {
  if (
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement(
      'textarea',
    );

  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents =
    'none';

  document.body.appendChild(
    textarea,
  );

  textarea.focus();
  textarea.select();

  const copied =
    document.execCommand('copy');

  textarea.remove();

  if (!copied) {
    throw new Error(
      'Không thể sao chép.',
    );
  }
}

export default function StaticPage({
  fixedSlug,
}) {
  const params = useParams();
  const toast = useToast();

  const pageRef = useRef(null);

  const slug =
    fixedSlug ||
    params.slug ||
    'gioi-thieu';

  const [page, setPage] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [copied, setCopied] =
    useState(false);

  const [
    readingProgress,
    setReadingProgress,
  ] = useState(0);

  const [
    usingFallback,
    setUsingFallback,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    setPage(null);
    setError(null);
    setLoading(true);
    setCopied(false);
    setReadingProgress(0);
    setUsingFallback(false);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    /*
     * Bốn trang cố định luôn sử dụng nội dung
     * khai báo trực tiếp trong fallbacks.
     *
     * Không gọi API nên dữ liệu cũ trong database
     * không thể ghi đè tiêu đề hoặc nội dung mới.
     */
    const localStaticPage =
      fallbacks[slug];

    if (localStaticPage) {
      setPage(localStaticPage);
      setLoading(false);

      return () => {
        active = false;
      };
    }

    /*
     * Chỉ gọi API đối với các slug động khác,
     * không nằm trong danh sách fallbacks.
     */
    systemApi
      .page(slug)
      .then((result) => {
        if (!active) {
          return;
        }

        setPage(
          normalizePage(result),
        );
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(requestError);
        setPage(DEFAULT_PAGE);
        setUsingFallback(true);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const pageConfig =
    PAGE_CONFIG[slug] || {
      eyebrow: 'Thông tin',
      icon: FileText,
      theme: 'default',
    };

  const PageIcon =
    pageConfig.icon;

  const preparedContent =
    useMemo(
      () =>
        prepareHtml(
          page?.body || '',
        ),
      [page?.body],
    );

  useEffect(() => {
    if (
      !page ||
      loading
    ) {
      return undefined;
    }

    let animationFrame = null;

    const updateProgress = () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
        );
      }

      animationFrame =
        requestAnimationFrame(() => {
          const root =
            pageRef.current;

          if (!root) {
            return;
          }

          const rootTop =
            root.getBoundingClientRect()
              .top +
            window.scrollY;

          const rootHeight =
            root.offsetHeight;

          const start =
            rootTop - 100;

          const end =
            rootTop +
            rootHeight -
            window.innerHeight * 0.7;

          const distance =
            Math.max(
              end - start,
              1,
            );

          const progress =
            (window.scrollY - start) /
            distance;

          setReadingProgress(
            Math.min(
              Math.max(
                progress,
                0,
              ),
              1,
            ),
          );
        });
    };

    updateProgress();

    window.addEventListener(
      'scroll',
      updateProgress,
      {
        passive: true,
      },
    );

    window.addEventListener(
      'resize',
      updateProgress,
    );

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame,
        );
      }

      window.removeEventListener(
        'scroll',
        updateProgress,
      );

      window.removeEventListener(
        'resize',
        updateProgress,
      );
    };
  }, [
    page,
    loading,
  ]);

  const handleCopyLink =
    useCallback(async () => {
      try {
        await copyText(
          window.location.href,
        );

        setCopied(true);

        toast.success(
          'Đã sao chép liên kết.',
        );

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        toast.error(
          'Không thể sao chép liên kết.',
        );
      }
    }, [toast]);

  const handleShare =
    useCallback(async () => {
      const shareData = {
        title: page?.title,

        text:
          page?.description ||
          'Thông tin từ Đô Thị Hòa Lạc',

        url:
          window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(
            shareData,
          );
        } catch (shareError) {
          if (
            shareError?.name !==
            'AbortError'
          ) {
            toast.error(
              'Không thể mở chức năng chia sẻ.',
            );
          }
        }

        return;
      }

      await handleCopyLink();
    }, [
      handleCopyLink,
      page,
      toast,
    ]);

  const scrollToHeading =
    useCallback(
      (headingId) => {
        const heading =
          document.getElementById(
            headingId,
          );

        if (!heading) {
          return;
        }

        heading.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      },
      [],
    );

  if (loading) {
    return (
      <section className="static-page-view">
        <Seo title="Đang tải thông tin" />

        <div className="static-page-container">
          <div className="static-page-loading">
            <LoadingBlock />
          </div>
        </div>
      </section>
    );
  }

  if (!page) {
    return (
      <section className="static-page-view">
        <Seo title="Không thể tải thông tin" />

        <div className="static-page-container">
          <ErrorState
            error={
              error ||
              new Error(
                'Không thể tải nội dung trang.',
              )
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={pageRef}
      className={[
        'static-page-view',
        `static-page-view--${pageConfig.theme}`,
      ].join(' ')}
    >
      <Seo
        title={page.title}
        description={
          page.description
        }
      />

      <div
        className="static-page-progress"
        aria-hidden="true"
      >
        <span
          style={{
            transform: `scaleX(${readingProgress})`,
          }}
        />
      </div>

      <div className="static-page-container">
        <nav
          className="static-page-breadcrumb"
          aria-label="Điều hướng trang"
        >
          <Link to="/">
            <ArrowLeft size={16} />
            Trang chủ
          </Link>

          <span>/</span>

          <span>
            {page.title}
          </span>
        </nav>

        <header className="static-page-hero">
          <div className="static-page-hero__icon">
            <PageIcon size={31} />
          </div>

          <div className="static-page-hero__content">
            <span className="static-page-hero__eyebrow">
              {pageConfig.eyebrow}
            </span>

            <h1>
              {page.title}
            </h1>

            {page.description ? (
              <p>
                {page.description}
              </p>
            ) : null}

            <div className="static-page-hero__meta">
              {page.updatedAt ? (
                <span>
                  <CalendarDays
                    size={16}
                  />

                  Cập nhật{' '}
                  {formatDateTime(
                    page.updatedAt,
                  )}
                </span>
              ) : null}

              <span>
                <ShieldCheck
                  size={16}
                />

                Thông tin chính thức
              </span>
            </div>
          </div>

          <div className="static-page-hero__actions">
            <button
              type="button"
              onClick={handleShare}
            >
              <Share2 size={17} />
              Chia sẻ
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}

              {copied
                ? 'Đã sao chép'
                : 'Sao chép link'}
            </button>
          </div>
        </header>

        {usingFallback ? (
          <div className="static-page-fallback-notice">
            <Info size={18} />

            <p>
              Nội dung trang động chưa tải
              được từ máy chủ. Hệ thống đang
              hiển thị nội dung mặc định.
            </p>
          </div>
        ) : null}

        <div className="static-page-layout">
          <main className="static-page-main">
            <article className="static-page-article">
              <div className="static-page-article__heading">
                <span>
                  <FileText size={20} />
                </span>

                <div>
                  <h2>
                    Nội dung thông tin
                  </h2>

                  <p>
                    Vui lòng đọc kỹ các nội
                    dung và quy định được
                    trình bày bên dưới.
                  </p>
                </div>
              </div>

              <div className="static-page-body">
                <ArticleBody
                  html={
                    preparedContent.html
                  }
                />
              </div>
            </article>

            <section className="static-page-support">
              <span>
                <Info size={22} />
              </span>

              <div>
                <strong>
                  Cần làm rõ nội dung?
                </strong>

                <p>
                  Khi cần hỗ trợ hoặc phản
                  hồi về thông tin trên
                  trang, bạn có thể liên hệ
                  với Đô Thị Hòa Lạc.
                </p>
              </div>

              <Link to="/lien-he">
                Liên hệ hỗ trợ
              </Link>
            </section>
          </main>

          <aside className="static-page-sidebar">
            <div className="static-page-sidebar__content">
              {preparedContent
                .headings.length ? (
                <section className="static-sidebar-card static-page-toc">
                  <div className="static-sidebar-heading">
                    <ScrollText
                      size={19}
                    />

                    <div>
                      <h2>
                        Mục lục
                      </h2>

                      <p>
                        Chuyển nhanh tới nội
                        dung cần xem.
                      </p>
                    </div>
                  </div>

                  <nav>
                    {preparedContent.headings.map(
                      (heading) => (
                        <button
                          type="button"
                          key={heading.id}
                          className={
                            heading.level ===
                            3
                              ? 'is-level-3'
                              : ''
                          }
                          onClick={() =>
                            scrollToHeading(
                              heading.id,
                            )
                          }
                        >
                          {heading.title}
                        </button>
                      ),
                    )}
                  </nav>
                </section>
              ) : null}

              <section className="static-sidebar-card">
                <div className="static-sidebar-heading">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <h2>
                      Thông tin trang
                    </h2>

                    <p>
                      Nội dung thuộc hệ
                      thống Đô Thị Hòa Lạc.
                    </p>
                  </div>
                </div>

                <dl className="static-page-info">
                  <div>
                    <dt>
                      <FileText
                        size={16}
                      />
                      Loại nội dung
                    </dt>

                    <dd>
                      Trang thông tin
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <ShieldCheck
                        size={16}
                      />
                      Trạng thái
                    </dt>

                    <dd>
                      Đang áp dụng
                    </dd>
                  </div>

                  {page.updatedAt ? (
                    <div>
                      <dt>
                        <CalendarDays
                          size={16}
                        />
                        Cập nhật
                      </dt>

                      <dd>
                        {formatDateTime(
                          page.updatedAt,
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="static-sidebar-card">
                <div className="static-sidebar-heading">
                  <Share2 size={19} />

                  <div>
                    <h2>
                      Công cụ
                    </h2>

                    <p>
                      Lưu hoặc chia sẻ nội
                      dung khi cần thiết.
                    </p>
                  </div>
                </div>

                <div className="static-page-tools">
                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <Share2 size={17} />
                    Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check size={17} />
                    ) : (
                      <Copy size={17} />
                    )}

                    {copied
                      ? 'Đã sao chép'
                      : 'Sao chép link'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.print()
                    }
                  >
                    <Printer size={17} />
                    In nội dung
                  </button>
                </div>
              </section>

              <section className="static-sidebar-card static-sidebar-contact">
                <span>
                  Đô Thị Hòa Lạc
                </span>

                <h2>
                  Thông tin minh bạch,
                  kết nối địa phương
                </h2>

                <p>
                  Nền tảng cung cấp thông
                  tin quy hoạch, hạ tầng,
                  bất động sản, việc làm
                  và hoạt động cộng đồng
                  tại Hòa Lạc.
                </p>

                <Link to="/lien-he">
                  Liên hệ với chúng tôi
                </Link>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {readingProgress > 0.35 ? (
        <button
          type="button"
          className="static-page-scroll-top"
          aria-label="Quay lên đầu trang"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            })
          }
        >
          <ChevronUp size={21} />
        </button>
      ) : null}
    </section>
  );
}