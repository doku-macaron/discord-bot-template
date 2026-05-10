import type { Job } from "@/jobs/job";
import { uptimeJob } from "@/jobs/jobs/uptimeJob";

export const jobs: ReadonlyArray<Job> = [uptimeJob];
