import { test, expect, type Page } from "@playwright/test";
async function createProblem(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo vấn đề" }).click();
  await page.getByLabel("Tên vấn đề").fill("Cải thiện sự tập trung");
  await page
    .getByLabel("Mô tả", { exact: true })
    .fill("Thường xuyên bị gián đoạn khi học.");
  await page.getByRole("button", { name: "Tạo vấn đề", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cải thiện sự tập trung", exact: true }),
  ).toBeVisible();
}
test("complete problem lifecycle persists across reloads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await createProblem(page);
  await page.getByRole("link", { name: "Phân tích", exact: true }).click();
  await page.getByLabel("Nguyên nhân").fill("Thông báo điện thoại quá nhiều");
  await page.getByLabel("Tác động").fill("Mất 2 giờ mỗi ngày");
  await page.getByLabel("Kết quả mong muốn").fill("Học liên tục 45 phút");
  await page.getByRole("button", { name: "Lưu phân tích" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.reload();
  await expect(page.getByLabel("Nguyên nhân")).toHaveValue(
    "Thông báo điện thoại quá nhiều",
  );
  await page.getByRole("link", { name: "Kế hoạch", exact: true }).click();
  await page.getByRole("button", { name: "Thêm phương án" }).click();
  await page.getByLabel("Tên phương án").fill("Tắt thông báo khi học");
  await page.getByLabel("Cách thực hiện").fill("Thiết lập chế độ tập trung");
  await page
    .getByRole("button", { name: "Thêm phương án", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Công việc", exact: true }).click();
  await page.getByLabel("Tên công việc").fill("Thiết lập chế độ tập trung");
  await page.getByRole("button", { name: "Lưu công việc" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Công việc", exact: true }).click();
  await page.getByLabel("Tên công việc").fill("Học 45 phút liên tục");
  await page
    .getByRole("checkbox", { name: "Thiết lập chế độ tập trung" })
    .check();
  await page.getByRole("button", { name: "Lưu công việc" }).click();
  await expect(
    page.getByRole("button", { name: "Hoàn thành Học 45 phút liên tục" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hoàn thành Thiết lập chế độ tập trung" })
    .click();
  await expect(
    page.getByRole("button", { name: "Hoàn thành Học 45 phút liên tục" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Hoàn thành Học 45 phút liên tục" })
    .click();
  await page.getByRole("link", { name: "Sơ đồ", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await page.getByRole("link", { name: "Đánh giá", exact: true }).click();
  await page
    .getByLabel("Kết quả thực tế")
    .fill("Đã học tập trung 45 phút trong 5 ngày");
  await page
    .getByLabel("Bài học rút ra")
    .fill("Môi trường quan trọng hơn ý chí");
  await page.getByRole("button", { name: "Đánh dấu đã giải quyết" }).click();
  await expect(page.locator(".inline-meta")).toContainText("Đã giải quyết");
  await page.reload();
  await expect(page.getByLabel("Bài học rút ra")).toHaveValue(
    "Môi trường quan trọng hơn ý chí",
  );
  await page.getByRole("link", { name: "Lịch sử", exact: true }).click();
  await expect(
    page.getByText("Đã đánh giá và giải quyết vấn đề"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await expect(page.locator(".inline-meta")).toContainText("Đã lưu trữ");
  await page.goto("/#/archive");
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Cải thiện sự tập trung" }),
    })
    .click();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(page.locator(".inline-meta")).not.toContainText("Đã lưu trữ");
  expect(errors).toEqual([]);
});
test("empty state, filters, search and responsive layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Chưa có vấn đề nào")).toBeVisible();
  await createProblem(page);
  await page.goto("/#/problems");
  await page
    .getByRole("textbox", { name: "Tìm kiếm", exact: true })
    .fill("không tồn tại");
  await expect(page.getByText("Chưa có vấn đề nào")).toBeVisible();
  await page.getByRole("button", { name: "Xóa tìm kiếm" }).click();
  await page.getByLabel("Lọc trạng thái").selectOption("resolved");
  await expect(page.getByText("Chưa có vấn đề nào")).toBeVisible();
  await page.getByLabel("Lọc trạng thái").selectOption("open");
  await expect(
    page.getByRole("heading", { name: "Cải thiện sự tập trung" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("JSON export and restore on a fresh browser profile", async ({
  page,
  browser,
  baseURL,
}) => {
  await createProblem(page);
  await page.goto("/#/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất dữ liệu" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  const context = await browser.newContext({ baseURL });
  const fresh = await context.newPage();
  await fresh.goto("/#/settings");
  await fresh.getByLabel("Nhập bản sao lưu JSON").setInputFiles(file!);
  await expect(fresh.getByRole("status")).toContainText("thành công");
  await fresh.goto("/#/problems");
  await expect(
    fresh.getByRole("heading", { name: "Cải thiện sự tập trung" }),
  ).toBeVisible();
  await fresh.goto("/#/settings");
  await fresh.getByLabel("Nhập bản sao lưu JSON").setInputFiles(file!);
  await expect(fresh.getByRole("status")).toContainText(
    "Không có dữ liệu nào bị ghi đè",
  );
  await context.close();
});
