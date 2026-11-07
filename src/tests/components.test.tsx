import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { ProblemForm } from "../components/forms";
import { TaskRow } from "../components/task-row";
import { service } from "../application";
import { emptySnapshot, type Task } from "../domain/models";
describe("forms and task interactions", () => {
  it("validates a problem title and submits actual user values", async () => {
    const save = vi
      .spyOn(service, "createProblem")
      .mockResolvedValue(crypto.randomUUID());
    const close = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProblemForm open close={close} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Tạo vấn đề" }));
    expect(await screen.findByText("Nhập ít nhất 3 ký tự")).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Tên vấn đề"),
      "Tập trung khi làm việc",
    );
    await user.click(screen.getByRole("button", { name: "Tạo vấn đề" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        title: "Tập trung khi làm việc",
        description: "",
        category: "Công việc",
        priority: "medium",
      }),
    );
    expect(close).toHaveBeenCalled();
    save.mockRestore();
  });
  it("disables completion while a prerequisite is unfinished", () => {
    const task: Task = {
      id: crypto.randomUUID(),
      problemId: crypto.randomUUID(),
      planId: crypto.randomUUID(),
      title: "Thực hiện",
      status: "todo",
      priority: "high",
      dueDate: "",
      dependencies: [crypto.randomUUID()],
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    render(
      <MemoryRouter>
        <TaskRow task={task} snapshot={{ ...emptySnapshot, tasks: [task] }} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "Hoàn thành Thực hiện" }),
    ).toBeDisabled();
    expect(screen.getByText(/Chờ:/)).toBeVisible();
  });
});
