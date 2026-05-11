import {
    ActionRowBuilder,
    ApplicationIntegrationType,
    bold,
    InteractionContextType,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Command } from "@/framework/discord/interactions/chatInput";
import { infoEmbed } from "@/lib/discord/embed";
import { buildPaginationRow } from "@/lib/discord/pagination";

export const HELP_FEATURE = "help";

type HelpEntry = { name: string; description: string };
type HelpSection = { title: string; entries: Array<HelpEntry> };

export const HELP_PAGES: ReadonlyArray<HelpSection> = [
    {
        title: "Basics",
        entries: [
            { name: "/ping", description: "Bot の応答を確認します" },
            { name: "/echo <message>", description: "入力した内容を返します (autocomplete サンプル)" },
        ],
    },
    {
        title: "Profile",
        entries: [
            { name: "/profile view", description: "プロフィールを表示します (Components v2)" },
            { name: "/profile edit", description: "モーダルで bio を編集・保存します" },
        ],
    },
    {
        title: "Admin",
        entries: [
            { name: "/admin set-mod-role", description: "Mod ロールを Role Select で選んで保存します" },
            { name: "/admin set-archive-channel", description: "アーカイブ用 channel を Channel Select で保存します" },
            { name: "/admin report-user-select", description: "User Select でユーザーを選んで report します" },
        ],
    },
    {
        title: "Showcase",
        entries: [
            { name: "/showcase", description: "Components v2 のリファレンス実装" },
            { name: "/showcase-modal", description: "Modal v2 (Checkbox / RadioGroup / CheckboxGroup / FileUpload) のリファレンス実装" },
            { name: "/poll", description: "モーダルから Discord ネイティブ Poll を作成します" },
        ],
    },
    {
        title: "Context menu",
        entries: [
            { name: "Get user profile", description: "ユーザーを右クリックしてプロフィールを表示します" },
            { name: "Report message", description: "メッセージを右クリックして report ID と URL を表示します" },
        ],
    },
];

function buildSectionSelectRow(currentTitle: string): ActionRowBuilder<StringSelectMenuBuilder> {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_ID.SELECT_MENU.HELP_SECTION)
        .setPlaceholder("セクションへジャンプ")
        .addOptions(
            HELP_PAGES.map((section) => ({
                label: section.title,
                value: section.title,
                default: section.title === currentTitle,
            }))
        );
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildHelpPage(rawPage: number) {
    const total = HELP_PAGES.length;
    const page = Math.max(0, Math.min(total - 1, rawPage));
    const section = HELP_PAGES[page] ?? HELP_PAGES[0];
    if (!section) {
        throw new Error("HELP_PAGES must contain at least one section.");
    }

    const description = section.entries.map((entry) => `${bold(entry.name)} — ${entry.description}`).join("\n");
    const embed = infoEmbed(`Help • ${section.title}`, description).setFooter({ text: `Page ${page + 1} / ${total}` });
    const paginationRow = buildPaginationRow(HELP_FEATURE, page, total);
    const selectRow = buildSectionSelectRow(section.title);

    return { embed, row: paginationRow, selectRow, page };
}

export const helpCommand = new Command(
    (builder) =>
        builder
            .setName("help")
            .setDescription("Bot のコマンド一覧を表示します")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async (interaction) => {
        const { embed, row, selectRow } = buildHelpPage(0);
        await interaction.reply({ embeds: [embed], components: [row, selectRow] });
    }
);
