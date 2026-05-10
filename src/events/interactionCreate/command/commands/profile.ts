import { ApplicationIntegrationType, EmbedBuilder, InteractionContextType } from "discord.js";
import { Command } from "@/events/interactionCreate/command/commandHandler";

export const profileCommand = new Command(
    (builder) =>
        builder
            .setName("profile")
            .setDescription("DB を使ったプロフィール例を表示します")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    async (interaction) => {
        if (!interaction.inCachedGuild()) {
            await interaction.reply("このコマンドはサーバー内で実行してください。");
            return;
        }

        await interaction.deferReply();

        const { getOrCreateGuild } = await import("@/db/query/guild/getOrCreateGuild");
        const { getOrCreateMember } = await import("@/db/query/member/getOrCreateMember");
        const { incrementMemberCommandCount } = await import("@/db/query/member/incrementMemberCommandCount");

        await getOrCreateGuild({
            guildId: interaction.guildId,
            name: interaction.guild.name,
        });
        await getOrCreateMember({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            displayName: interaction.member.displayName,
        });

        const member = await incrementMemberCommandCount({
            guildId: interaction.guildId,
            userId: interaction.user.id,
        });

        const embed = new EmbedBuilder()
            .setTitle("Profile")
            .setColor(0x57f287)
            .addFields([
                {
                    name: "User",
                    value: `<@${member.userId}>`,
                    inline: true,
                },
                {
                    name: "Command Count",
                    value: `${member.commandCount}`,
                    inline: true,
                },
            ]);

        await interaction.editReply({ embeds: [embed] });
    }
);
