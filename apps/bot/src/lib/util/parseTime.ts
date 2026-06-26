// "5m" / "1h30m" / "45s" / "1h 30m" のような文字列を ms に変換。
export function parseDuration(input: string): number | null {
    let totalMs = 0;
    let matched = false;
    for (const match of input
        .trim()
        .toLowerCase()
        .matchAll(/(\d+)\s*([smh])/g)) {
        matched = true;
        const value = Number.parseInt(match[1] ?? "0", 10);
        const unit = match[2];
        const factor = unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000;
        totalMs += value * factor;
    }
    return matched && totalMs > 0 ? totalMs : null;
}

// `HH:MM` (今日のその時刻、過去なら翌日) もしくは Date.parse が拾える形式 (ISO 等)。
export function parseTargetTime(input: string, now: Date): Date | null {
    const trimmed = input.trim();

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime()) && direct.getTime() > now.getTime()) {
        return direct;
    }

    const hhmm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (hhmm) {
        const hours = Number.parseInt(hhmm[1] ?? "0", 10);
        const minutes = Number.parseInt(hhmm[2] ?? "0", 10);
        if (hours < 24 && minutes < 60) {
            const target = new Date(now);
            target.setHours(hours, minutes, 0, 0);
            if (target.getTime() <= now.getTime()) {
                target.setDate(target.getDate() + 1);
            }
            return target;
        }
    }

    return null;
}
