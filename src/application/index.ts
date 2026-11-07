import { ResolveService } from "./service";
import { DexieRepository } from "../infrastructure/database";
export const repository = new DexieRepository();
export const service = new ResolveService(repository);
