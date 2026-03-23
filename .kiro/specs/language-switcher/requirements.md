# Tài Liệu Yêu Cầu

## Giới Thiệu

Tính năng chuyển đổi ngôn ngữ (Language Switcher) cho phép người dùng ứng dụng ACRM (AI Carbon-Resilience Management) chuyển đổi giao diện giữa Tiếng Anh và Tiếng Việt. Toàn bộ văn bản giao diện — bao gồm nhãn điều hướng, tiêu đề, thông báo, placeholder và nội dung tĩnh — sẽ được hiển thị theo ngôn ngữ mà người dùng đã chọn. Lựa chọn ngôn ngữ được lưu lại giữa các phiên làm việc.

## Bảng Thuật Ngữ

- **Language_Switcher**: Component giao diện cho phép người dùng chọn ngôn ngữ hiển thị.
- **I18n_System**: Hệ thống quốc tế hóa (internationalization) quản lý việc tải và áp dụng bản dịch.
- **Translation_Catalog**: Tập hợp các cặp khóa-giá trị chứa văn bản giao diện cho một ngôn ngữ cụ thể.
- **Locale**: Mã định danh ngôn ngữ theo chuẩn IETF BCP 47 (ví dụ: `en`, `vi`).
- **Active_Locale**: Locale đang được áp dụng cho giao diện tại thời điểm hiện tại.
- **Navbar**: Thanh điều hướng chính của ứng dụng, nơi đặt Language_Switcher.
- **UI_Text**: Toàn bộ văn bản tĩnh hiển thị trên giao diện người dùng, không bao gồm nội dung do AI tạo ra.
- **Persistence_Layer**: Cơ chế lưu trữ lựa chọn ngôn ngữ của người dùng (localStorage).

---

## Yêu Cầu

### Yêu Cầu 1: Hiển Thị Bộ Chọn Ngôn Ngữ

**User Story:** Là người dùng, tôi muốn thấy một nút/menu chọn ngôn ngữ trên thanh điều hướng, để tôi có thể dễ dàng chuyển đổi ngôn ngữ giao diện bất cứ lúc nào.

#### Tiêu Chí Chấp Nhận

1. THE **Navbar** SHALL hiển thị **Language_Switcher** ở khu vực bên phải, cạnh ThemeToggle.
2. THE **Language_Switcher** SHALL hiển thị Locale hiện tại dưới dạng nhãn ngắn gọn (ví dụ: `EN` hoặc `VI`).
3. THE **Language_Switcher** SHALL hiển thị danh sách các ngôn ngữ được hỗ trợ gồm: Tiếng Anh (`en`) và Tiếng Việt (`vi`).
4. WHEN người dùng nhấn vào **Language_Switcher**, THE **Language_Switcher** SHALL mở dropdown hiển thị tên đầy đủ của từng ngôn ngữ (ví dụ: "English", "Tiếng Việt").
5. WHEN người dùng nhấn ra ngoài dropdown đang mở, THE **Language_Switcher** SHALL đóng dropdown mà không thay đổi **Active_Locale**.
6. THE **Language_Switcher** SHALL hiển thị dấu hiệu trực quan (ví dụ: dấu tích hoặc highlight) cho ngôn ngữ đang được chọn trong dropdown.

---

### Yêu Cầu 2: Chuyển Đổi Ngôn Ngữ Giao Diện

**User Story:** Là người dùng, tôi muốn chọn Tiếng Việt và thấy toàn bộ giao diện chuyển sang tiếng Việt ngay lập tức, để tôi có thể sử dụng ứng dụng bằng ngôn ngữ mẹ đẻ.

#### Tiêu Chí Chấp Nhận

1. WHEN người dùng chọn một ngôn ngữ từ **Language_Switcher**, THE **I18n_System** SHALL cập nhật **Active_Locale** thành Locale tương ứng.
2. WHEN **Active_Locale** thay đổi, THE **I18n_System** SHALL tải **Translation_Catalog** tương ứng và áp dụng cho toàn bộ **UI_Text** mà không cần tải lại trang.
3. THE **I18n_System** SHALL dịch **UI_Text** trong các component sau: Navbar, Footer, HeroSection, FeaturesSection, ArchitectureSection, FormulaSection, CTASection, ChatInterface, ModelSelector, RegionSelector, SessionHistory, SmartRecommendation, CarbonBudget, ScheduledTasks, ResilienceDashboard, và các trang Advisor, Analytics, Compare, Team.
4. WHEN **Active_Locale** là `vi`, THE **I18n_System** SHALL hiển thị toàn bộ **UI_Text** bằng Tiếng Việt theo **Translation_Catalog** tiếng Việt.
5. WHEN **Active_Locale** là `en`, THE **I18n_System** SHALL hiển thị toàn bộ **UI_Text** bằng Tiếng Anh theo **Translation_Catalog** tiếng Anh.
6. THE **I18n_System** SHALL không dịch nội dung do AI tạo ra trong các tin nhắn chat.

---

### Yêu Cầu 3: Lưu Trữ Lựa Chọn Ngôn Ngữ

**User Story:** Là người dùng, tôi muốn ứng dụng ghi nhớ ngôn ngữ tôi đã chọn, để tôi không phải chọn lại mỗi khi mở ứng dụng.

#### Tiêu Chí Chấp Nhận

1. WHEN người dùng chọn một ngôn ngữ, THE **Persistence_Layer** SHALL lưu **Active_Locale** vào localStorage với khóa `acrm-locale`.
2. WHEN ứng dụng khởi động, THE **I18n_System** SHALL đọc giá trị Locale từ localStorage và áp dụng làm **Active_Locale** ban đầu.
3. IF giá trị Locale trong localStorage không hợp lệ hoặc không tồn tại, THEN THE **I18n_System** SHALL sử dụng `en` làm **Active_Locale** mặc định.
4. THE **Persistence_Layer** SHALL lưu trữ Locale dưới dạng chuỗi ký tự theo chuẩn IETF BCP 47 (ví dụ: `"en"`, `"vi"`).

---

### Yêu Cầu 4: Quản Lý Translation Catalog

**User Story:** Là nhà phát triển, tôi muốn có một hệ thống quản lý bản dịch rõ ràng, để tôi có thể dễ dàng thêm hoặc cập nhật nội dung dịch thuật.

#### Tiêu Chí Chấp Nhận

1. THE **I18n_System** SHALL tổ chức **Translation_Catalog** thành các file JSON riêng biệt cho từng Locale (ví dụ: `locales/en.json`, `locales/vi.json`).
2. THE **I18n_System** SHALL sử dụng cấu trúc khóa phân cấp (namespace) để nhóm các bản dịch theo component hoặc trang (ví dụ: `navbar.home`, `chat.placeholder`).
3. IF một khóa dịch thuật không tồn tại trong **Translation_Catalog** của **Active_Locale**, THEN THE **I18n_System** SHALL hiển thị giá trị tương ứng từ **Translation_Catalog** tiếng Anh làm fallback.
4. THE **Translation_Catalog** SHALL bao gồm bản dịch đầy đủ cho tất cả **UI_Text** được liệt kê trong Yêu Cầu 2, tiêu chí 3.

---

### Yêu Cầu 5: Khả Năng Tiếp Cận (Accessibility)

**User Story:** Là người dùng sử dụng công nghệ hỗ trợ, tôi muốn có thể thao tác với bộ chọn ngôn ngữ bằng bàn phím và trình đọc màn hình, để tôi không bị loại trừ khỏi tính năng này.

#### Tiêu Chí Chấp Nhận

1. THE **Language_Switcher** SHALL có thuộc tính `aria-label` mô tả chức năng (ví dụ: "Chọn ngôn ngữ / Select language").
2. WHEN dropdown **Language_Switcher** đang mở, THE **Language_Switcher** SHALL có thuộc tính `aria-expanded="true"`.
3. WHEN người dùng nhấn phím `Escape` khi dropdown đang mở, THE **Language_Switcher** SHALL đóng dropdown.
4. THE **Language_Switcher** SHALL hỗ trợ điều hướng bằng phím `Tab` và `Enter` để chọn ngôn ngữ.
5. WHEN **Active_Locale** thay đổi, THE **I18n_System** SHALL cập nhật thuộc tính `lang` của thẻ `<html>` thành mã Locale tương ứng (ví dụ: `lang="vi"`).

---

### Yêu Cầu 6: Tính Nhất Quán Của Bản Dịch (Round-Trip)

**User Story:** Là nhà phát triển, tôi muốn đảm bảo hệ thống dịch thuật hoạt động nhất quán, để không có nội dung nào bị mất hoặc sai khi chuyển đổi qua lại giữa các ngôn ngữ.

#### Tiêu Chí Chấp Nhận

1. FOR ALL khóa dịch thuật trong **Translation_Catalog** tiếng Anh, THE **I18n_System** SHALL có khóa tương ứng trong **Translation_Catalog** tiếng Việt.
2. WHEN người dùng chuyển từ `en` sang `vi` rồi chuyển lại `en`, THE **I18n_System** SHALL hiển thị lại đúng toàn bộ **UI_Text** tiếng Anh ban đầu (tính chất round-trip).
3. THE **I18n_System** SHALL không làm thay đổi cấu trúc layout hoặc kích thước component khi chuyển đổi ngôn ngữ, ngoại trừ sự thay đổi kích thước tự nhiên do độ dài văn bản.
