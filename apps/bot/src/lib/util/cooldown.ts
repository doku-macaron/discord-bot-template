type CooldownEntry = {
    count: number;
    resetAt: number;
};

export type CooldownOptions = {
    windowMs: number;
    limit?: number;
    now?: () => number;
};

export type CooldownDecision =
    | {
          allowed: true;
          remaining: number;
          resetAt: Date;
      }
    | {
          allowed: false;
          retryAfterMs: number;
          resetAt: Date;
      };

export class CooldownStore {
    private readonly entries = new Map<string, CooldownEntry>();
    private readonly limit: number;
    private readonly now: () => number;
    private readonly windowMs: number;

    constructor(options: CooldownOptions) {
        if (options.windowMs <= 0) {
            throw new Error("Cooldown windowMs must be greater than 0.");
        }

        this.limit = options.limit ?? 1;

        if (this.limit <= 0) {
            throw new Error("Cooldown limit must be greater than 0.");
        }

        this.now = options.now ?? Date.now;
        this.windowMs = options.windowMs;
    }

    hit(key: string): CooldownDecision {
        const now = this.now();
        const existing = this.entries.get(key);

        if (!existing || existing.resetAt <= now) {
            const resetAt = now + this.windowMs;
            this.entries.set(key, { count: 1, resetAt });

            return {
                allowed: true,
                remaining: this.limit - 1,
                resetAt: new Date(resetAt),
            };
        }

        if (existing.count >= this.limit) {
            return {
                allowed: false,
                retryAfterMs: existing.resetAt - now,
                resetAt: new Date(existing.resetAt),
            };
        }

        existing.count += 1;

        return {
            allowed: true,
            remaining: this.limit - existing.count,
            resetAt: new Date(existing.resetAt),
        };
    }

    reset(key: string) {
        this.entries.delete(key);
    }

    pruneExpired() {
        const now = this.now();

        for (const [key, entry] of this.entries) {
            if (entry.resetAt <= now) {
                this.entries.delete(key);
            }
        }
    }
}

export function createCooldownKey(...parts: Array<string | null | undefined>) {
    return parts.filter((part): part is string => Boolean(part)).join(":");
}
