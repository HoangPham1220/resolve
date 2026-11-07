import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ResolveService } from "../application/service";
import { DexieRepository, ResolveDatabase } from "../infrastructure/database";
import { backupSchema, type Task } from "../domain/models";
import { progress } from "../domain/logic";

describe("Resolve application services with IndexedDB", () => {
  let database: ResolveDatabase;
  let repository: DexieRepository;
  let service: ResolveService;

  beforeEach(() => {
    database = new ResolveDatabase(`resolve-test-${crypto.randomUUID()}`);
    repository = new DexieRepository(database);
    service = new ResolveService(repository);
  });

  afterEach(async () => {
    await database.delete();
  });

  async function fixture() {
    const problemId = await service.createProblem({
      title: "Improve focus",
      description: "Interruptions during study",
      category: "Học tập",
      priority: "high",
    });
    await service.createPlan(problemId, {
      title: "Reduce interruptions",
      description: "Use focus mode",
    });
    const plan = (await repository.read()).plans[0];
    await service.saveTask({
      problemId,
      planId: plan.id,
      title: "Configure focus mode",
      dueDate: "",
      priority: "medium",
      dependencies: [],
    });
    const task = (await repository.read()).tasks[0];
    return { problemId, plan, task };
  }

  function taskInput(task: Task) {
    return {
      problemId: task.problemId,
      planId: task.planId,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      dependencies: task.dependencies,
    };
  }

  it("keeps linked entities, stable UUIDs, timestamps, and activity after reopening the database", async () => {
    const { problemId, plan, task } = await fixture();
    const before = await repository.read();
    database.close();
    await database.open();
    expect(await repository.read()).toEqual(before);
    expect(before.problems[0].id).toBe(problemId);
    expect(before.tasks[0].planId).toBe(plan.id);
    expect(before.tasks[0].id).toBe(task.id);
    expect(before.activities).toHaveLength(3);
    expect(Number.isNaN(Date.parse(before.problems[0].createdAt))).toBe(false);
  });

  it("rejects dependency cycles and rolls back both task edits and activity writes", async () => {
    const { problemId, plan, task } = await fixture();
    await service.saveTask({
      problemId,
      planId: plan.id,
      title: "Study for 45 minutes",
      dueDate: "",
      priority: "high",
      dependencies: [task.id],
    });
    const before = await repository.read();
    const second = before.tasks.find((item) => item.id !== task.id)!;
    await expect(
      service.saveTask(
        { ...taskInput(task), dependencies: [second.id] },
        task.id,
      ),
    ).rejects.toThrow("vòng lặp");
    expect(await repository.read()).toEqual(before);
  });

  it("blocks starting dependent tasks and reopening a completed prerequisite", async () => {
    const { problemId, plan, task } = await fixture();
    await service.saveTask({
      problemId,
      planId: plan.id,
      title: "Study for 45 minutes",
      dueDate: "",
      priority: "high",
      dependencies: [task.id],
    });
    const second = (await repository.read()).tasks.find(
      (item) => item.id !== task.id,
    )!;
    const before = await repository.read();
    await expect(service.setTaskStatus(second.id, "doing")).rejects.toThrow();
    await expect(service.setTaskStatus(second.id, "done")).rejects.toThrow();
    expect(await repository.read()).toEqual(before);
    await service.setTaskStatus(task.id, "done");
    await service.setTaskStatus(second.id, "done");
    const completed = await repository.read();
    expect(progress(completed.tasks)).toBe(100);
    expect(completed.problems[0].status).toBe("in_progress");
    await expect(service.setTaskStatus(task.id, "todo")).rejects.toThrow();
    expect(await repository.read()).toEqual(completed);
  });

  it("requires completed tasks and a substantive review before resolving a problem", async () => {
    const { problemId, task } = await fixture();
    await expect(
      service.updateProblem(problemId, {
        status: "resolved",
        review: "Improved concentration",
      }),
    ).rejects.toThrow();
    await service.setTaskStatus(task.id, "done");
    await expect(
      service.updateProblem(problemId, { status: "resolved", review: "   " }),
    ).rejects.toThrow();
    await service.updateProblem(problemId, {
      status: "resolved",
      review: "Studied for 45 minutes on five consecutive days",
      lessons: "Remove interruptions first",
    });
    expect((await repository.read()).problems[0].status).toBe("resolved");
    await expect(service.setTaskStatus(task.id, "todo")).rejects.toThrow();
    await expect(
      service.createPlan(problemId, {
        title: "Another approach",
        description: "",
      }),
    ).rejects.toThrow();
    await service.updateProblem(problemId, { status: "in_progress" });
    await service.setTaskStatus(task.id, "todo");
    expect((await repository.read()).tasks[0].status).toBe("todo");
  });

  it("archives without deleting linked records and permits restoring for editing", async () => {
    const { problemId } = await fixture();
    await service.archive(problemId, true);
    const archived = await repository.read();
    expect(archived.problems[0].archived).toBe(true);
    expect(archived.tasks).toHaveLength(1);
    expect(archived.plans).toHaveLength(1);
    await expect(
      service.updateProblem(problemId, { causes: "Frequent phone alerts" }),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(archived);
    await service.archive(problemId, false);
    await service.updateProblem(problemId, { causes: "Frequent phone alerts" });
    expect((await repository.read()).problems[0].causes).toBe(
      "Frequent phone alerts",
    );
  });

  it("round trips a versioned backup into a separate database without losing links or activity", async () => {
    await fixture();
    const backup = await service.exportBackup();
    expect(backupSchema.parse(JSON.parse(backup)).version).toBe(1);
    const target = new ResolveDatabase(`restore-test-${crypto.randomUUID()}`);
    try {
      const targetRepository = new DexieRepository(target);
      await new ResolveService(targetRepository).importBackup(backup);
      expect(await targetRepository.read()).toEqual(await repository.read());
    } finally {
      await target.delete();
    }
  });

  it("rejects conflicting, malformed, and broken-reference backups without modifying current data", async () => {
    await fixture();
    const backup = await service.exportBackup();
    const before = await repository.read();
    await expect(service.importBackup(backup)).rejects.toThrow("trùng");
    await expect(service.importBackup("{invalid")).rejects.toThrow();
    const broken = backupSchema.parse(JSON.parse(backup));
    broken.tasks[0].planId = crypto.randomUUID();
    await expect(service.importBackup(JSON.stringify(broken))).rejects.toThrow(
      "liên kết",
    );
    const future = { ...broken, version: 2 };
    await expect(
      service.importBackup(JSON.stringify(future)),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(before);
  });

  it("updates plan content while preserving identity, linked tasks, and read-only guards", async () => {
    const { problemId, plan, task } = await fixture();
    await service.updatePlan(plan.id, {
      title: "Silence phone notifications",
      description: "Enable focus mode before each study session",
    });
    const updated = await repository.read();
    expect(updated.plans[0]).toMatchObject({
      id: plan.id,
      problemId,
      createdAt: plan.createdAt,
      title: "Silence phone notifications",
      description: "Enable focus mode before each study session",
    });
    expect(updated.tasks[0].planId).toBe(plan.id);
    expect(updated.activities).toHaveLength(4);
    await expect(
      service.updatePlan(plan.id, { title: " ", description: "" }),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(updated);
    await service.archive(problemId, true);
    const archived = await repository.read();
    await expect(
      service.updatePlan(plan.id, {
        title: "Another approach",
        description: "",
      }),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(archived);
    await service.archive(problemId, false);
    await service.setTaskStatus(task.id, "done");
    await service.updateProblem(problemId, {
      status: "resolved",
      review: "Focus sessions now last 45 minutes",
    });
    const resolved = await repository.read();
    await expect(
      service.updatePlan(plan.id, {
        title: "Another approach",
        description: "",
      }),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(resolved);
  });

  it("moves tasks within their own plan, preserves dependencies, and treats boundaries as no-ops", async () => {
    const { problemId, plan, task } = await fixture();
    await service.saveTask({
      problemId,
      planId: plan.id,
      title: "Study for 45 minutes",
      dueDate: "",
      priority: "high",
      dependencies: [task.id],
    });
    await service.saveTask({
      problemId,
      planId: plan.id,
      title: "Record the outcome",
      dueDate: "",
      priority: "low",
      dependencies: [],
    });
    await service.createPlan(problemId, {
      title: "Alternative approach",
      description: "",
    });
    const alternative = (await repository.read()).plans.find(
      (item) => item.id !== plan.id,
    )!;
    await service.saveTask({
      problemId,
      planId: alternative.id,
      title: "Keep this task separate",
      dueDate: "",
      priority: "low",
      dependencies: [],
    });
    const before = await repository.read();
    const third = before.tasks.find(
      (item) => item.title === "Record the outcome",
    )!;
    const second = before.tasks.find(
      (item) => item.title === "Study for 45 minutes",
    )!;
    const unrelated = before.tasks.find(
      (item) => item.planId === alternative.id,
    )!;
    await service.moveTask(third.id, -1);
    const moved = await repository.read();
    const ordered = moved.tasks
      .filter((item) => item.planId === plan.id)
      .sort((a, b) => a.order - b.order);
    expect(ordered.map((item) => item.id)).toEqual([
      task.id,
      third.id,
      second.id,
    ]);
    expect(ordered.map((item) => item.order)).toEqual([0, 1, 2]);
    expect(ordered[2].dependencies).toEqual([task.id]);
    expect(moved.tasks.find((item) => item.id === unrelated.id)).toEqual(
      unrelated,
    );
    await service.moveTask(third.id, 1);
    const originalOrder = await repository.read();
    expect(
      originalOrder.tasks
        .filter((item) => item.planId === plan.id)
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id),
    ).toEqual([task.id, second.id, third.id]);
    await service.moveTask(task.id, -1);
    await service.moveTask(third.id, 1);
    expect(await repository.read()).toEqual(originalOrder);
    await service.archive(problemId, true);
    const archived = await repository.read();
    await expect(service.moveTask(third.id, -1)).rejects.toThrow();
    expect(await repository.read()).toEqual(archived);
  });

  it("ignores injected task identity, status, ordering, and timestamps when creating a task", async () => {
    const { task } = await fixture();
    const injected: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: "A genuinely new task",
      status: "done",
      order: 999,
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
    };
    await service.saveTask(injected);
    const snapshot = await repository.read();
    const created = snapshot.tasks.find((item) => item.id !== task.id)!;
    expect(created.title).toBe(injected.title);
    expect(created.id).not.toBe(injected.id);
    expect(created.status).toBe("todo");
    expect(created.order).toBe(1);
    expect(created.createdAt).not.toBe(injected.createdAt);
    expect(created.updatedAt).not.toBe(injected.updatedAt);
    expect(snapshot.tasks.find((item) => item.id === task.id)).toEqual(task);
  });

  it("prevents editing a task into another problem even when both problems and plans exist", async () => {
    const { task } = await fixture();
    const otherId = await service.createProblem({
      title: "Another problem",
      description: "",
      category: "Cá nhân",
      priority: "low",
    });
    await service.createPlan(otherId, {
      title: "Another plan",
      description: "",
    });
    const before = await repository.read();
    const otherPlan = before.plans.find((item) => item.problemId === otherId)!;
    await expect(
      service.saveTask(
        { ...taskInput(task), problemId: otherId, planId: otherPlan.id },
        task.id,
      ),
    ).rejects.toThrow();
    expect(await repository.read()).toEqual(before);
  });

  it("validates problem fields and rejects task references to unrelated plans", async () => {
    await expect(
      service.createProblem({
        title: " ",
        description: "",
        category: "Cá nhân",
        priority: "low",
      }),
    ).rejects.toThrow();
    const { task } = await fixture();
    const before = await repository.read();
    await expect(
      service.saveTask(
        { ...taskInput(task), planId: crypto.randomUUID() },
        task.id,
      ),
    ).rejects.toThrow("liên kết");
    expect(await repository.read()).toEqual(before);
  });
});
