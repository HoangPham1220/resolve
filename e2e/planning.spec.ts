import { expect, test, type Page } from "@playwright/test";

async function createProblem(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo vấn đề" }).click();
  await page.getByLabel("Tên vấn đề").fill("Chủ động lập kế hoạch học tập");
  await page.getByRole("button", { name: "Tạo vấn đề", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Chủ động lập kế hoạch học tập",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kế hoạch", exact: true }).click();
}

async function createPlan(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Thêm phương án", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên phương án").fill(title);
  await dialog.getByLabel("Cách thực hiện").fill(`Cách thực hiện cho ${title}`);
  await dialog
    .getByRole("button", { name: "Thêm phương án", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}

function planSection(page: Page, title: string) {
  return page
    .locator(".plan-panel")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("selected plan, plan corrections, task dependencies and manual order persist", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await createProblem(page);
  await createPlan(page, "Học theo chủ đề");
  await createPlan(page, "Học theo dự án");

  const secondPlan = planSection(page, "Học theo dự án");
  await secondPlan
    .getByRole("button", { name: "Công việc", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog
      .getByRole("combobox", { name: "Phương án", exact: true })
      .locator("option:checked"),
  ).toHaveText("Học theo dự án");
  await dialog.getByLabel("Tên công việc").fill("Xác định mục tiêu dự án");
  await dialog.getByRole("button", { name: "Lưu công việc" }).click();
  await expect(dialog).toHaveCount(0);

  await secondPlan
    .getByRole("button", { name: "Công việc", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog
      .getByRole("combobox", { name: "Phương án", exact: true })
      .locator("option:checked"),
  ).toHaveText("Học theo dự án");
  await dialog.getByLabel("Tên công việc").fill("Thực hiện dự án nhỏ");
  await dialog
    .getByRole("checkbox", { name: "Xác định mục tiêu dự án" })
    .check();
  await dialog.getByRole("button", { name: "Lưu công việc" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(secondPlan.locator(".task-title")).toHaveText([
    "Xác định mục tiêu dự án",
    "Thực hiện dự án nhỏ",
  ]);
  await expect(
    planSection(page, "Học theo chủ đề").locator(".task-row"),
  ).toHaveCount(0);
  await expect(
    secondPlan.getByRole("button", { name: "Hoàn thành Thực hiện dự án nhỏ" }),
  ).toBeDisabled();

  await secondPlan.getByRole("button", { name: "Sửa phương án" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên phương án").fill("Học qua sản phẩm thực tế");
  await dialog
    .getByLabel("Cách thực hiện")
    .fill("Tạo sản phẩm có thể kiểm thử và sử dụng.");
  await dialog.getByRole("button", { name: "Lưu phương án" }).click();
  await expect(dialog).toHaveCount(0);
  const updatedPlan = planSection(page, "Học qua sản phẩm thực tế");
  await expect(updatedPlan.locator(".task-context")).toHaveCount(2);
  await expect(updatedPlan.locator(".task-context").first()).toContainText(
    "Học qua sản phẩm thực tế",
  );
  await expect(updatedPlan.locator(".task-context").last()).toContainText(
    "Học qua sản phẩm thực tế",
  );

  await updatedPlan
    .getByRole("button", { name: "Đưa lên Thực hiện dự án nhỏ" })
    .click();
  await expect(updatedPlan.locator(".task-title")).toHaveText([
    "Thực hiện dự án nhỏ",
    "Xác định mục tiêu dự án",
  ]);
  await page.reload();
  await expect(updatedPlan.locator(".task-title")).toHaveText([
    "Thực hiện dự án nhỏ",
    "Xác định mục tiêu dự án",
  ]);
  await expect(
    updatedPlan.getByText("Tạo sản phẩm có thể kiểm thử và sử dụng.", {
      exact: true,
    }),
  ).toBeVisible();

  await updatedPlan
    .getByRole("button", { name: "Sửa Xác định mục tiêu dự án", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Thực hiện dự án nhỏ" }).check();
  await dialog.getByRole("button", { name: "Lưu công việc" }).click();
  await expect(dialog.getByRole("alert")).toContainText("vòng lặp");
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.reload();
  await expect(
    updatedPlan.getByRole("button", {
      name: "Hoàn thành Xác định mục tiêu dự án",
    }),
  ).toBeEnabled();
  await expect(
    updatedPlan.getByRole("button", { name: "Hoàn thành Thực hiện dự án nhỏ" }),
  ).toBeDisabled();
  await expect(updatedPlan.locator(".task-title")).toHaveText([
    "Thực hiện dự án nhỏ",
    "Xác định mục tiêu dự án",
  ]);
  expect(errors).toEqual([]);
});
