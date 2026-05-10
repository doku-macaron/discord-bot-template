import type { Job } from "@/jobs/_core/job";
import { uptimeJob } from "@/jobs/items/uptimeJob";

export const jobs: ReadonlyArray<Job> = [uptimeJob];
