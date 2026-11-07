import Dexie, { type EntityTable } from "dexie";
import type { Activity, Plan, Problem, Task, Snapshot } from "../domain/models";
import type { ResolveRepository } from "../domain/repository";
import { validateSnapshot } from "../domain/logic";
export class ResolveDatabase extends Dexie {
  problems!: EntityTable<Problem, "id">;
  plans!: EntityTable<Plan, "id">;
  tasks!: EntityTable<Task, "id">;
  activities!: EntityTable<Activity, "id">;
  constructor(name = "resolve-v1") {
    super(name);
    this.version(1).stores({
      problems: "id,status,archived,updatedAt",
      plans: "id,problemId",
      tasks: "id,problemId,planId,status,dueDate",
      activities: "id,problemId,createdAt",
    });
  }
}
export const db = new ResolveDatabase();
export class DexieRepository implements ResolveRepository {
  constructor(private database: ResolveDatabase = db) {}
  async read(): Promise<Snapshot> {
    return this.database.transaction("r", this.database.tables, async () => {
      const [problems, plans, tasks, activities] = await Promise.all([
        this.database.problems.toArray(),
        this.database.plans.toArray(),
        this.database.tasks.toArray(),
        this.database.activities.toArray(),
      ]);
      return { problems, plans, tasks, activities };
    });
  }
  async mutate(change: (snapshot: Snapshot) => void) {
    await this.database.transaction("rw", this.database.tables, async () => {
      const snapshot = await this.read();
      change(snapshot);
      validateSnapshot(snapshot);
      await this.database.problems.bulkPut(snapshot.problems);
      await this.database.plans.bulkPut(snapshot.plans);
      await this.database.tasks.bulkPut(snapshot.tasks);
      await this.database.activities.bulkPut(snapshot.activities);
    });
  }
}
