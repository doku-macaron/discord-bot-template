import { buildHelpPage, HELP_FEATURE, HELP_PAGES } from "@/events/interactionCreate/commands/chatInput/items/help";
import { Button } from "@/framework/discord/interactions/components/button/buttonHandler";
import { nextPage, paginationCustomIdPattern, parsePaginationCustomId } from "@/lib/discord/pagination";

export const helpPaginationButton = new Button(
    () => paginationCustomIdPattern(HELP_FEATURE),
    async (interaction) => {
        const parsed = parsePaginationCustomId(interaction.customId);
        if (!parsed) {
            await interaction.deferUpdate();
            return;
        }

        const target = nextPage(parsed.action, parsed.page, HELP_PAGES.length);
        const { embed, row, selectRow } = buildHelpPage(target);
        await interaction.update({ embeds: [embed], components: [row, selectRow] });
    }
);
