import {
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    RadioGroupBuilder,
    TextInputBuilder,
    TextInputStyle,
    TimestampStyles,
    time,
    userMention,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";
import { logger } from "@/lib/infra/logger";

const MESSAGE_MAX_LENGTH = 200;
const MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MODE_DURATION = "duration";
const MODE_TARGET_TIME = "target-time";

const MODE_OPTIONS = [
    { label: "経過時間で指定", value: MODE_DURATION },
    { label: "指定時刻で指定", value: MODE_TARGET_TIME },
] as const;

export function createTimerModal(): ModalBuilder {
    const modeRadio = new RadioGroupBuilder().setCustomId(CUSTOM_ID.INPUT.TIMER_MODE).addOptions(...MODE_OPTIONS);

    const durationInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.TIMER_DURATION)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(20);

    const targetTimeInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.TIMER_TARGET_TIME)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40);

    const messageInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.TIMER_MESSAGE)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(MESSAGE_MAX_LENGTH);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.TIMER)
        .setTitle("タイマー設定")
        .addLabelComponents(
            new LabelBuilder().setLabel("モード").setRadioGroupComponent(modeRadio),
            new LabelBuilder()
                .setLabel("経過時間")
                .setDescription("例: 5m / 1h30m / 45s (モードが「経過時間で指定」のときに使用)")
                .setTextInputComponent(durationInput),
            new LabelBuilder()
                .setLabel("指定時刻")
                .setDescription("例: 15:30 (今日のその時刻、過去なら明日) または 2026-05-12 09:00")
                .setTextInputComponent(targetTimeInput),
            new LabelBuilder().setLabel("通知メッセージ").setTextInputComponent(messageInput)
        );
}

// "5m" / "1h30m" / "45s" / "1h 30m" のような文字列を ms に変換。
function parseDuration(input: string): number | null {
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
function parseTargetTime(input: string, now: Date): Date | null {
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

export const timerModal = new Modal(
    () => CUSTOM_ID.MODAL.TIMER,
    async (interaction) => {
        const mode = interaction.fields.getRadioGroup(CUSTOM_ID.INPUT.TIMER_MODE, true);
        const durationRaw = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.TIMER_DURATION).trim();
        const targetTimeRaw = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.TIMER_TARGET_TIME).trim();
        const message = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.TIMER_MESSAGE).trim();

        const now = new Date();
        let fireAt: Date | null = null;

        if (mode === MODE_DURATION) {
            if (!durationRaw) {
                await interaction.reply({ content: "「経過時間」欄を入力してください (例: 5m)。", flags: MessageFlags.Ephemeral });
                return;
            }
            const ms = parseDuration(durationRaw);
            if (ms === null) {
                await interaction.reply({
                    content: `「経過時間」を解釈できませんでした: "${durationRaw}"`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            fireAt = new Date(now.getTime() + ms);
        } else {
            if (!targetTimeRaw) {
                await interaction.reply({ content: "「指定時刻」欄を入力してください (例: 15:30)。", flags: MessageFlags.Ephemeral });
                return;
            }
            fireAt = parseTargetTime(targetTimeRaw, now);
            if (fireAt === null) {
                await interaction.reply({
                    content: `「指定時刻」を解釈できませんでした: "${targetTimeRaw}"`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        const delayMs = fireAt.getTime() - now.getTime();
        if (delayMs > MAX_DELAY_MS) {
            await interaction.reply({
                content: `タイマーは最長 7 日までです (指定: ${time(fireAt, TimestampStyles.LongDateTime)})。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const { client, channelId, user } = interaction;
        if (channelId === null) {
            await interaction.reply({ content: "チャンネル内で実行してください。", flags: MessageFlags.Ephemeral });
            return;
        }

        // In-memory timer. Bot 再起動で失われる sample 実装。本番運用なら
        // DB に積んで clientReady で復元するか、外部スケジューラを使う。
        setTimeout(() => {
            void (async () => {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (!channel?.isSendable()) {
                        return;
                    }
                    await channel.send(`${userMention(user.id)} ⏰ ${message}`);
                } catch (unknownError) {
                    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
                    logger.error("Bot", error);
                }
            })();
        }, delayMs);

        await interaction.reply({
            content: `タイマーをセットしました: ${time(fireAt, TimestampStyles.RelativeTime)} (${time(fireAt, TimestampStyles.LongDateTime)})`,
            flags: MessageFlags.Ephemeral,
        });
    }
);
