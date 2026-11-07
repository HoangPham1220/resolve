import type { Snapshot } from "./models";
export interface ResolveRepository {
  read(): Promise<Snapshot>;
  mutate(change: (snapshot: Snapshot) => void): Promise<void>;
}
