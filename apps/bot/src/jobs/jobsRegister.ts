import type { Job } from "@/framework/jobs/job";
import { uptimeJob } from "@/jobs/items/uptimeJob";

export const jobs: ReadonlyArray<Job> = [uptimeJob];
