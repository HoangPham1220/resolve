# Resolve

Ứng dụng cá nhân để đi từ **vấn đề → phân tích → phương án → công việc → thực hiện → đánh giá**. Mỗi công việc liên kết với một phương án và vấn đề cụ thể, giúp người dùng thấy mục đích đằng sau hành động.

Mã nguồn ứng dụng nằm trong thư mục `resolve/`, tách khỏi các tệp dữ liệu đã có ở thư mục cha. Ứng dụng khởi tạo với dữ liệu trống; không tự chèn dữ liệu mẫu.

## Chạy trên máy

Yêu cầu Node.js 24 và npm. Chạy các lệnh bên dưới tại thư mục chứa README này:

```powershell
npm ci
npm run dev
```

Mở địa chỉ localhost Vite in ra trong terminal. Giữ nguyên hostname và port khi muốn tiếp tục dùng cùng cơ sở dữ liệu của trình duyệt.

Tạo và xem bản production:

```powershell
npm run build
npm run preview
```

`build` chạy kiểm tra strict TypeScript trước khi tạo thư mục `dist/`. Không mở `dist/index.html` trực tiếp bằng giao thức `file://`; dùng HTTP server hoặc hosting tĩnh. Không cần Node.js backend khi chạy ứng dụng đã build.

## Phạm vi MVP

| Khu vực           | Hành vi đã triển khai                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tổng quan         | Thống kê từ dữ liệu thật, vấn đề gần đây, hành động có thể bắt đầu, trạng thái trống                                             |
| Vấn đề            | Tạo và sửa tên, mô tả, lĩnh vực, mức ưu tiên; tìm kiếm; lọc trạng thái/lĩnh vực; sắp xếp                                         |
| Phân tích         | Lưu nguyên nhân gốc rễ, tác động, kết quả mong muốn                                                                              |
| Kế hoạch          | Tạo và sửa nhiều phương án; tạo và chỉnh sửa công việc gắn với phương án                                                         |
| Thực hiện         | Trạng thái cần làm/đang làm/hoàn thành, hạn hoàn thành, ưu tiên, công việc tiền đề; đưa công việc lên/xuống trong cùng phương án |
| Sơ đồ             | Hiển thị quan hệ vấn đề–phương án–công việc và các phụ thuộc; kéo khung nhìn, thu phóng                                          |
| Đánh giá          | Ghi kết quả thực tế và bài học; đóng hoặc mở lại vấn đề                                                                          |
| Hoạt động         | Lịch sử thao tác có thời gian, gắn với từng vấn đề                                                                               |
| Công việc của tôi | Lọc sẵn sàng, tất cả, đang chờ, quá hạn, hoàn thành; truy ngược về kế hoạch                                                      |
| Lưu trữ           | Lưu trữ và khôi phục vấn đề cùng toàn bộ dữ liệu liên quan                                                                       |
| Cài đặt           | Xuất/nhập bản sao lưu JSON; yêu cầu lưu trữ bền vững từ trình duyệt                                                              |

Desktop dùng sidebar; mobile dùng thanh điều hướng dưới. Dialog dùng Radix để quản lý focus và thao tác bàn phím. Dữ liệu văn bản được hiển thị dưới dạng văn bản React, không đưa vào HTML thô.

### Luồng sử dụng

1. Tạo một vấn đề, chọn lĩnh vực và mức ưu tiên.
2. Trong **Phân tích**, ghi nguyên nhân, tác động và đích đến có thể quan sát được.
3. Trong **Kế hoạch**, thêm phương án rồi chia thành các công việc cụ thể. Có thể sửa phương án và dùng nút đưa lên/xuống để sắp thứ tự công việc trong cùng phương án.
4. Đặt công việc tiền đề nếu cần. Dùng **Công việc của tôi** để chọn việc sẵn sàng.
5. Hoàn thành công việc, sau đó ghi kết quả thực tế và bài học ở **Đánh giá**.
6. Đánh dấu đã giải quyết khi có đánh giá và mọi công việc đã hoàn thành. Lưu trữ khi muốn đưa vấn đề ra khỏi danh sách hiện tại.

Hoàn thành tất cả công việc không tự đóng vấn đề: người dùng cần đánh giá liệu vấn đề thực sự đã được giải quyết hay chưa. Vấn đề không cần công việc vẫn có thể đóng nếu đã ghi đánh giá.

### Quy tắc nghiệp vụ

- ID là UUID; các thực thể chính có `createdAt` và `updatedAt` theo ISO UTC. Giao diện hiển thị thời gian theo thiết bị.
- Tiêu đề dài 3–160 ký tự sau khi trim; nội dung dài tối đa 10.000 ký tự mỗi trường.
- Công việc phải thuộc một phương án của cùng vấn đề.
- Phụ thuộc phải cùng vấn đề, tồn tại và không tạo vòng lặp hoặc tự phụ thuộc.
- Không thể bắt đầu/hoàn thành công việc khi tiền đề chưa xong. Không thể mở lại tiền đề nếu điều đó làm một công việc đã bắt đầu mất điều kiện hợp lệ.
- Vấn đề đã giải quyết phải có đánh giá khác rỗng và không còn công việc chưa hoàn thành.
- Mở lại vấn đề trước khi thêm phương án hoặc thay đổi công việc của một vấn đề đã giải quyết.
- Vấn đề lưu trữ ở chế độ chỉ đọc; khôi phục trước khi sửa. Lưu trữ không xóa bản ghi liên quan.
- Việc ghi dữ liệu và lịch sử diễn ra trong cùng transaction; kiểm tra thất bại thì không ghi một phần.

## Dữ liệu và sao lưu

IndexedDB qua Dexie là nguồn dữ liệu chính, với database `resolve-v1` và bốn bảng: `problems`, `plans`, `tasks`, `activities`. Zustand chỉ giữ trạng thái giao diện như từ khóa và thông báo. Không dùng `localStorage` làm cơ sở dữ liệu.

Dữ liệu tồn tại sau khi tải lại trang, đóng và mở lại trình duyệt thông thường. Dữ liệu thuộc về **origin và hồ sơ trình duyệt**, không phải tài khoản: chuyển từ localhost sang GitHub Pages, đổi domain, port, trình duyệt hoặc thiết bị sẽ mở một vùng lưu trữ khác. Đổi đường dẫn trong cùng origin không tạo vùng lưu trữ IndexedDB riêng. Các bản ứng dụng cùng origin dùng tên database này sẽ cùng truy cập dữ liệu đó.

Ứng dụng không gửi dữ liệu nghiệp vụ đến backend. IndexedDB không phải bản sao lưu: xóa dữ liệu website, chế độ riêng tư, mất thiết bị hoặc trình duyệt tự dọn dung lượng có thể làm mất dữ liệu. Trong **Cài đặt**, có thể yêu cầu `navigator.storage.persist()`; trình duyệt quyết định có cấp hay không. Hãy xuất JSON định kỳ và trước khi đổi địa chỉ hosting.

### Định dạng sao lưu

Tệp JSON chứa `version: 1`, `exportedAt` và toàn bộ bốn tập bản ghi. Tệp này không được mã hóa; lưu ở vị trí phù hợp với nội dung cá nhân của bạn.

Nhập dữ liệu thực hiện:

1. Kiểm tra giới hạn 20 MB và schema Zod, bao gồm UUID, ngày, trạng thái và độ dài trường.
2. Kiểm tra liên kết thực thể, đồ thị phụ thuộc và điều kiện đóng vấn đề.
3. Từ chối toàn bộ tệp nếu có ID trùng trong tệp hoặc trùng với dữ liệu hiện có trong cùng bảng.
4. Thêm toàn bộ bản ghi hợp lệ trong một transaction, không ghi đè bản ghi có sẵn.

Để chuyển thiết bị: xuất ở máy cũ, mở Resolve ở máy mới rồi nhập tệp. Nhập lại cùng một bản sao lưu trên máy đã có các ID đó sẽ bị từ chối, thay vì cập nhật hay nhân đôi. MVP chưa hỗ trợ hòa giải xung đột hoặc nhập ghi đè.

## Kiến trúc

```text
Presentation: app/, features/, components/
    ↓ gọi use case
Application: application/ResolveService
    ↓ dùng model, validation, quy tắc
Domain: domain/models.ts, logic.ts, repository.ts
    ↓ qua ResolveRepository
Infrastructure: infrastructure/database.ts
    ↓
Dexie / IndexedDB
```

```text
src/
├── app/App.tsx                 Shell, điều hướng và error boundary
├── application/                Use case và khởi tạo dependency
├── components/                 Form, task row, UI primitives
├── domain/                     Schema, kiểu, quy tắc và repository interface
├── features/                   Dashboard, danh sách, chi tiết, sơ đồ, cài đặt
├── infrastructure/database.ts  Schema Dexie và repository implementation
├── stores/ui.ts                Trạng thái giao diện Zustand
├── tests/                      Unit và component tests
└── styles.css                  Theme và responsive styles
e2e/                            Playwright journeys
.github/workflows/pages.yml     Kiểm tra và triển khai Pages
```

`ResolveService` không phụ thuộc React hay Dexie. Nghiệp vụ dùng `ResolveRepository.read()` và `mutate()`. `DexieRepository` đọc snapshot, áp dụng thay đổi, xác thực rồi ghi trong transaction nhiều bảng. `useLiveQuery` làm giao diện cập nhật khi dữ liệu thay đổi. Sơ đồ được dẫn xuất từ dữ liệu nghiệp vụ, không phải một bản dữ liệu độc lập cần đồng bộ.

### Bổ sung backend về sau

Giữ các schema và quy tắc thuần trong domain, triển khai adapter mới cho `ResolveRepository`, rồi thay dependency tại `application/index.ts`. API backend cần thực thi lại validation và transaction ở phía server; không được tin dữ liệu từ client. PostgreSQL có thể lưu các quan hệ hiện có bằng khóa ngoại và UUID.

`mutate()` hiện nhận callback thay đổi snapshot trong bộ nhớ, phù hợp MVP cá nhân. Callback không được gửi trực tiếp qua HTTP. Adapter API cần tải snapshot có version, áp dụng callback ở client, gửi lệnh hoặc thay đổi cùng optimistic version, rồi để server kiểm tra và commit nguyên tử. Khi có đồng bộ nhiều thiết bị, nên nâng interface lên các command cụ thể và subscription để xử lý concurrency, thay vì gửi toàn bộ database cho mỗi thao tác. Việc này thay lớp repository/use-case plumbing; quy tắc domain và component không cần viết lại từ đầu.

### Database versioning và migration

Schema ban đầu khai báo `version(1).stores(...)`. Không đổi tên database hoặc xóa bảng để cập nhật ứng dụng. Khi cần thay schema:

1. Giữ khai báo version cũ, thêm `version(2).stores(...)` và `.upgrade(transaction => ...)` để chuyển dữ liệu có sẵn.
2. Với trường bắt buộc mới, cấp giá trị tương thích trong migration trước khi schema domain yêu cầu nó.
3. Dùng fixture database version cũ để kiểm thử mở bản mới, giữ nguyên UUID, liên kết và dữ liệu.
4. Nếu đổi định dạng backup, tăng `backup.version` và cung cấp bộ chuyển đổi rõ ràng. Database version và backup version là hai hợp đồng riêng.
5. Kiểm tra cả transaction rollback và bản sao lưu trước khi phát hành migration.

Hiện chỉ có schema version 1, chưa có migration chuyển đổi từ một schema cũ hơn.

## Stack và quyết định thiết kế

- React + TypeScript strict, Vite, React Router, Zustand, Dexie, React Hook Form + Zod, React Flow, date-fns và Lucide.
- Tailwind CSS v4 tích hợp qua Vite; CSS tùy chỉnh định nghĩa theme, layout và trạng thái responsive để giao diện thống nhất.
- `Button` và `Dialog` là component cục bộ theo mô hình shadcn/ui: Radix Slot/Dialog, CVA, `clsx`, `tailwind-merge`, có `components.json`. Không cài cả một bộ component có chức năng chưa dùng. Theme màu xanh và typography được tùy chỉnh trong `styles.css`.
- `HashRouter` giữ route sau dấu `#`, tránh yêu cầu rewrite trên GitHub Pages. Vite `base: './'` tạo đường dẫn asset tương đối để dùng được ở project Pages.
- Phần chi tiết vấn đề được lazy-load. React Flow chỉ phục vụ hiển thị quan hệ; chỉnh nghiệp vụ qua form để mọi thay đổi đi qua validation.
- Không có backend, tài khoản hoặc dịch vụ bên ngoài cho MVP cá nhân. Không cần secrets hoặc biến môi trường.
- Phiên bản thực tế được khóa trong `package-lock.json`; dùng `npm ci` để tái lập môi trường.

## Kiểm thử

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Trên Linux CI, dùng `npx playwright install --with-deps chromium`. Playwright tự khởi động Vite ở `http://127.0.0.1:4173`, chạy Chromium desktop và viewport/touch emulation iPhone 13 bằng Chromium. Đây không phải kiểm thử Safari/WebKit thật.

- **Vitest + fake-indexeddb:** kiểm tra các use case và tính nhất quán của dữ liệu trong IndexedDB giả lập.
- **React Testing Library:** kiểm tra nhập form, validation, giá trị gửi lên service và trạng thái công việc bị chặn.
- **Playwright:** kiểm tra hành trình từ tạo vấn đề đến phân tích, phương án, phụ thuộc, hoàn thành, sơ đồ, đánh giá, lưu trữ/khôi phục; tìm kiếm/lọc; lưu sau reload; xuất và nhập ở browser context mới.
- Trace của lượt E2E thất bại nằm trong `test-results/`; mở bằng `npx playwright show-trace <đường-dẫn-trace.zip>`.

Test tạo dữ liệu riêng trong database/test browser profile. Không có test seed nào chạy khi ứng dụng được mở để sử dụng thực tế. Kết quả chạy cụ thể được báo trong lần bàn giao; README không thay thế kết quả kiểm thử.

Kết quả kiểm tra: 12 service tests và 2 component tests đạt; 8 lượt E2E trên bản production đạt (4 hành trình trên mỗi cấu hình desktop/mobile), bao gồm sửa phương án, chọn đúng phương án, sắp thứ tự lưu qua reload và từ chối vòng lặp phụ thuộc. Chạy `npm run build` rồi `npm run test:e2e:production` để kiểm thử bản đóng gói; script tự phục vụ `dist/` ở port 4174. CI sử dụng chế độ production này.

### Ảnh giao diện

Ảnh trạng thái trống từ ứng dụng thật: [Desktop](docs/screenshots/desktop.png) · [Mobile](docs/screenshots/mobile.png).

Để chụp lại bằng Chromium, chạy dev server ở đúng port trong một terminal:

```powershell
npm run dev -- --port 4173
```

Sau đó chạy từ thư mục ứng dụng trong terminal khác:

```powershell
node scripts/capture.mjs
```

Script dùng browser context mới, không chèn dữ liệu, và ghi ảnh toàn trang vào `docs/screenshots/desktop.png` và `docs/screenshots/mobile.png`. Cần cài Chromium bằng lệnh Playwright ở trên trước khi chạy.

## Triển khai GitHub Pages

Repository riêng tư: https://github.com/HoangPham1220/resolve. GitHub đã xác minh quyền truy cập và tạo repository. Gói tài khoản hiện tại không hỗ trợ GitHub Pages cho repository riêng tư (API trả HTTP 422). CI vẫn chạy kiểm thử và build; deployment chỉ bật khi repository variable `ENABLE_PAGES` có giá trị `true`. Chưa có URL Pages công khai. Không cần GitHub CLI để chạy workflow.

Khi có quyền truy cập:

1. Đặt **nội dung của thư mục `resolve/` ở root của repository** dành cho ứng dụng; không đưa các tệp dữ liệu riêng ở thư mục cha vào repository.
2. Kết nối remote hợp lệ, push nhánh `main` bằng Git hoặc công cụ GitHub đã đăng nhập.
3. Khi tài khoản/repository hỗ trợ Pages, chọn **Settings → Pages → Source: GitHub Actions**, rồi đặt repository variable **ENABLE_PAGES=true** trong **Settings → Secrets and variables → Actions → Variables**. Không thay đổi quyền riêng tư của repository nếu chưa chủ động quyết định công khai mã nguồn.
4. Cho phép workflow chạy. Job `verify` cài dependency, chạy unit/component tests, build, cài Chromium, chạy E2E rồi upload `dist/`. Job `deploy` chỉ chạy sau khi `verify` thành công và dùng Pages artifact đó.
5. Mở URL từ deployment environment `github-pages` sau khi workflow hoàn tất. Kiểm tra tạo dữ liệu, tải lại trang và xuất bản sao lưu trên origin production.

Pull request chỉ xác minh, không triển khai. Workflow cũng hỗ trợ chạy thủ công. Nếu dùng monorepo giữ thư mục con `resolve/`, cần đặt workflow ở `.github/workflows/` của repository và điều chỉnh working directory, `cache-dependency-path`, đường dẫn artifact; workflow hiện cung cấp cho repository có app ở root.

## Giới hạn hiện tại

- Dành cho một người dùng trên trình duyệt, chưa có đăng nhập, đồng bộ cloud, teamwork hoặc phân quyền.
- Chưa có service worker/PWA: dữ liệu lưu cục bộ nhưng việc mở ứng dụng khi mất mạng hoàn toàn sau khi đóng tab không được bảo đảm.
- Chưa có xóa phương án hoặc xóa vĩnh viễn vấn đề/công việc. Lưu trữ là cách đưa vấn đề ra khỏi luồng hiện tại.
- Có sắp thứ tự thủ công bằng nút lên/xuống trong cùng phương án; chưa có kéo thả hoặc Kanban. Thứ tự này không thay thế quy tắc công việc tiền đề. Dashboard và danh sách công việc vẫn dùng hạn/ưu tiên để giúp chọn bước tiếp theo.
- Sơ đồ là chế độ xem tự sinh, chưa lưu vị trí tùy chỉnh, chỉnh node trực tiếp hoặc xuất ảnh.
- Chưa có thông báo nền, công việc lặp lại, đính kèm tệp hoặc dashboard phân tích nâng cao.
- Repository hiện đọc và kiểm tra snapshot đầy đủ mỗi lần ghi để ưu tiên tính nhất quán và đơn giản. Với tập dữ liệu lớn cần cập nhật theo bản ghi, tối ưu index/query và phân trang.
- Bản sao lưu là JSON đầy đủ, giới hạn 20 MB; chưa có import CSV hoặc cơ chế hòa giải trùng ID.

Đặc tả đầu vào kết thúc giữa phần điều hướng mobile. Các quyết định còn thiếu được triển khai theo nguyên tắc MVP: ít thao tác, không có nút giả, duy trì liên kết mục đích của từng công việc và không ghi đè dữ liệu người dùng.
