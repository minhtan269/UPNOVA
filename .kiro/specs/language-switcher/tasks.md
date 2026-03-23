# Kế Hoạch Triển Khai: Language Switcher

## Tổng Quan

Triển khai hệ thống i18n thuần React Context (không dùng thư viện ngoài) cho ứng dụng ACRM Next.js App Router, hỗ trợ chuyển đổi giữa Tiếng Anh (`en`) và Tiếng Việt (`vi`) với persistence qua localStorage.

## Tasks

- [x] 1. Tạo kiểu dữ liệu và hằng số i18n
  - Tạo file `lib/i18n/types.ts` định nghĩa `Locale`, `LanguageContextValue`, `TranslationCatalog`
  - Khai báo `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `STORAGE_KEY`
  - _Yêu cầu: 3.4, 4.1, 4.2_

- [x] 2. Tạo Translation Catalogs (en + vi)
  - [x] 2.1 Tạo `locales/en.json` với toàn bộ khóa phân cấp theo namespace
    - Bao gồm tất cả namespace: `navbar`, `footer`, `hero`, `features`, `architecture`, `formula`, `cta`, `chat`, `modelSelector`, `regionSelector`, `sessionHistory`, `smartRecommendation`, `carbonBudget`, `scheduledTasks`, `resilienceDashboard`, `advisor`, `analytics`, `compare`, `team`, `languageSwitcher`, `common`
    - _Yêu cầu: 4.1, 4.2, 4.4_

  - [x] 2.2 Tạo `locales/vi.json` với bản dịch tiếng Việt đầy đủ, cùng cấu trúc khóa với `en.json`
    - Đảm bảo tất cả khóa trong `en.json` đều có mặt trong `vi.json`
    - _Yêu cầu: 4.1, 4.4, 6.1_

  - [ ]* 2.3 Viết property test cho Property 5: Key parity catalog
    - **Property 5: Tính đầy đủ của catalog (key parity)**
    - **Validates: Yêu cầu 4.4, 6.1**
    - Dùng `fast-check` với `fc.constantFrom(...enKeys)` để kiểm tra mọi khóa `en` tồn tại trong `vi`

- [x] 3. Tạo LanguageContext và LanguageProvider
  - [x] 3.1 Tạo `lib/i18n/context.tsx` với `LanguageContext` và `LanguageProvider`
    - Khởi tạo locale từ `localStorage` trong `useEffect` (tránh SSR hydration mismatch)
    - Bọc `try/catch` cho mọi thao tác `localStorage`
    - Cập nhật `document.documentElement.lang` khi locale thay đổi
    - Implement hàm `t(key, fallback?)` với logic: catalog active → catalog `en` → key gốc
    - Bỏ qua `setLocale` nếu locale không nằm trong `SUPPORTED_LOCALES`
    - _Yêu cầu: 2.1, 2.2, 3.1, 3.2, 3.3, 4.3, 5.5_

  - [ ]* 3.2 Viết property test cho Property 1: Locale lookup trả về đúng catalog
    - **Property 1: Locale lookup trả về đúng catalog**
    - **Validates: Yêu cầu 2.4, 2.5**
    - Dùng `fc.constantFrom("en", "vi")` và `fc.string()` để kiểm tra `t(key)` luôn trả về `string`

  - [ ]* 3.3 Viết property test cho Property 2: Round-trip chuyển đổi ngôn ngữ
    - **Property 2: Round-trip chuyển đổi ngôn ngữ**
    - **Validates: Yêu cầu 6.2**
    - Chuyển `en → vi → en`, kiểm tra `t(key)` bằng giá trị ban đầu

  - [ ]* 3.4 Viết property test cho Property 4: Fallback về tiếng Anh khi khóa thiếu
    - **Property 4: Fallback về tiếng Anh khi khóa thiếu**
    - **Validates: Yêu cầu 4.3**
    - Tạo catalog `vi` giả thiếu một số khóa, kiểm tra `t(key)` trả về giá trị `en`

  - [ ]* 3.5 Viết property test cho Property 6: Fallback khi localStorage không hợp lệ
    - **Property 6: Fallback khi localStorage không hợp lệ**
    - **Validates: Yêu cầu 3.3**
    - Dùng `fc.oneof(fc.constant(null), fc.constant("fr"), fc.string())` để kiểm tra locale mặc định là `"en"`

  - [ ]* 3.6 Viết property test cho Property 7: Cập nhật lang attribute của HTML
    - **Property 7: Cập nhật lang attribute của HTML**
    - **Validates: Yêu cầu 5.5**
    - Dùng `fc.constantFrom("en", "vi")`, sau `setLocale(locale)` kiểm tra `document.documentElement.lang === locale`

- [x] 4. Tạo useTranslation hook và tích hợp Persistence
  - [x] 4.1 Tạo `lib/i18n/useTranslation.ts` export hook `useTranslation()`
    - Throw lỗi có thông báo rõ ràng nếu dùng ngoài `LanguageProvider`
    - _Yêu cầu: 2.1, 2.2_

  - [ ]* 4.2 Viết property test cho Property 3: Persistence round-trip
    - **Property 3: Persistence round-trip**
    - **Validates: Yêu cầu 3.1, 3.2, 3.4**
    - Sau `setLocale(locale)`, kiểm tra `localStorage["acrm-locale"]` đúng; mock re-mount kiểm tra locale được khôi phục

- [x] 5. Tạo LanguageSwitcher component
  - [x] 5.1 Tạo `components/LanguageSwitcher.tsx`
    - Hiển thị nhãn ngắn gọn locale hiện tại (`EN` / `VI`)
    - Dropdown với tên đầy đủ ("English", "Tiếng Việt") và dấu tích cho ngôn ngữ active
    - Đóng dropdown khi click ra ngoài (`mousedown` listener trong `useEffect`)
    - Đóng dropdown khi nhấn `Escape`
    - Hỗ trợ `Tab` và `Enter`/`Space` để chọn ngôn ngữ
    - ARIA: `aria-label`, `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`, `aria-selected`
    - _Yêu cầu: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 5.2 Viết property test cho Property 8: Nhãn hiển thị locale
    - **Property 8: Nhãn hiển thị locale**
    - **Validates: Yêu cầu 1.2**
    - Dùng `fc.constantFrom("en", "vi")`, kiểm tra nhãn hiển thị là `locale.toUpperCase()`

  - [ ]* 5.3 Viết property test cho Property 9: ARIA expanded đồng bộ với trạng thái dropdown
    - **Property 9: ARIA expanded đồng bộ với trạng thái dropdown**
    - **Validates: Yêu cầu 5.2**
    - Kiểm tra `aria-expanded` phản ánh đúng trạng thái mở/đóng sau mỗi lần toggle

  - [ ]* 5.4 Viết property test cho Property 10: Đóng dropdown không thay đổi locale
    - **Property 10: Đóng dropdown không thay đổi locale**
    - **Validates: Yêu cầu 1.5, 5.3**
    - Dùng `fc.constantFrom("en", "vi")`, mở dropdown rồi đóng bằng `Escape`/click ngoài, kiểm tra locale không đổi

  - [ ]* 5.5 Viết unit tests cho LanguageSwitcher
    - Kiểm tra dropdown hiển thị "English" và "Tiếng Việt" khi mở (Yêu cầu 1.3, 1.4)
    - Kiểm tra `aria-label` tồn tại (Yêu cầu 5.1)
    - Kiểm tra dấu tích hiển thị đúng ngôn ngữ active (Yêu cầu 1.6)

- [x] 6. Checkpoint — Đảm bảo core i18n hoạt động
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có vấn đề phát sinh.

- [x] 7. Tích hợp LanguageProvider vào app/layout.tsx
  - Bọc `{children}` bằng `<LanguageProvider>` trong `RootLayout`
  - Xóa `lang="en"` hardcode trên thẻ `<html>` (provider sẽ quản lý động)
  - Thêm `<LanguageSwitcher>` vào `Navbar` cạnh `ThemeToggle`
  - _Yêu cầu: 1.1, 5.5_

- [~] 8. Dịch Navbar và Footer
  - [x] 8.1 Cập nhật `components/Navbar.tsx` dùng `useTranslation()`
    - Thay thế tất cả text tĩnh bằng `t("navbar.*")`
    - _Yêu cầu: 2.3_

  - [x] 8.2 Cập nhật `components/Footer.tsx` dùng `useTranslation()`
    - Thay thế tất cả text tĩnh bằng `t("footer.*")`
    - _Yêu cầu: 2.3_

  - [ ]* 8.3 Viết unit tests kiểm tra Navbar và Footer render đúng với cả hai locale
    - _Yêu cầu: 2.3, 2.4, 2.5_

- [x] 9. Dịch các component trang chủ (home/*)
  - [x] 9.1 Cập nhật `components/home/HeroSection.tsx` dùng `t("hero.*")`
    - _Yêu cầu: 2.3_

  - [x] 9.2 Cập nhật `components/home/FeaturesSection.tsx` dùng `t("features.*")`
    - _Yêu cầu: 2.3_

  - [x] 9.3 Cập nhật `components/home/ArchitectureSection.tsx` dùng `t("architecture.*")`
    - _Yêu cầu: 2.3_

  - [x] 9.4 Cập nhật `components/home/FormulaSection.tsx` dùng `t("formula.*")`
    - _Yêu cầu: 2.3_

  - [x] 9.5 Cập nhật `components/home/CTASection.tsx` dùng `t("cta.*")`
    - _Yêu cầu: 2.3_

- [-] 10. Dịch các component chat và sidebar
  - [x] 10.1 Cập nhật `components/ChatInterface.tsx` dùng `t("chat.*")`
    - Không dịch nội dung tin nhắn AI, chỉ dịch UI text (placeholder, nút, nhãn)
    - _Yêu cầu: 2.3, 2.6_

  - [x] 10.2 Cập nhật `components/ModelSelector.tsx` dùng `t("modelSelector.*")`
    - _Yêu cầu: 2.3_

  - [x] 10.3 Cập nhật `components/RegionSelector.tsx` dùng `t("regionSelector.*")`
    - _Yêu cầu: 2.3_

  - [x] 10.4 Cập nhật `components/SessionHistory.tsx` dùng `t("sessionHistory.*")`
    - _Yêu cầu: 2.3_

  - [ ] 10.5 Cập nhật `components/SmartRecommendation.tsx` dùng `t("smartRecommendation.*")`
    - _Yêu cầu: 2.3_

  - [x] 10.6 Cập nhật `components/CarbonBudget.tsx` dùng `t("carbonBudget.*")`
    - _Yêu cầu: 2.3_

  - [x] 10.7 Cập nhật `components/ScheduledTasks.tsx` dùng `t("scheduledTasks.*")`
    - _Yêu cầu: 2.3_

  - [x] 10.8 Cập nhật `components/ResilienceDashboard.tsx` dùng `t("resilienceDashboard.*")`
    - _Yêu cầu: 2.3_

- [~] 11. Dịch các trang (app/*)
  - [~] 11.1 Cập nhật `app/advisor/page.tsx` (hoặc component tương ứng) dùng `t("advisor.*")`
    - _Yêu cầu: 2.3_

  - [~] 11.2 Cập nhật `app/analytics/page.tsx` dùng `t("analytics.*")`
    - _Yêu cầu: 2.3_

  - [~] 11.3 Cập nhật `app/compare/page.tsx` dùng `t("compare.*")`
    - _Yêu cầu: 2.3_

  - [~] 11.4 Cập nhật `app/team/page.tsx` và `components/team/TeamCard.tsx` dùng `t("team.*")`
    - _Yêu cầu: 2.3_

- [~] 12. Checkpoint cuối — Đảm bảo toàn bộ tính năng hoạt động
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có vấn đề phát sinh.

## Ghi Chú

- Tasks đánh dấu `*` là tùy chọn, có thể bỏ qua để triển khai MVP nhanh hơn
- Mỗi property test tham chiếu đúng một property trong design document
- Property tests dùng `fast-check` với tối thiểu 100 iterations (`{ numRuns: 100 }`)
- Mỗi property test có comment: `// Feature: language-switcher, Property {N}: {tên property}`
- `LanguageProvider` dùng `useEffect` để đọc localStorage, tránh SSR hydration mismatch
- Không dịch nội dung AI-generated trong chat (Yêu cầu 2.6)
