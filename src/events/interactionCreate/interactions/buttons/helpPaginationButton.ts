import { buildHelpPage, HELP_FEATURE, HELP_PAGES } from "@/events/interactionCreate/command/commands/help";
import { Button } from "@/events/interactionCreate/interactions/buttonHandler";
import { nextPage, paginationCustomIdPattern, parsePaginationCustomId } from "@/lib/pagination";

export const helpPaginationButton = new Button(
    () => paginationCustomIdPattern(HELP_FEATURE),
    async (interaction) => {
        const parsed = parsePaginationCustomId(interaction.customId);
        if (!parsed) {
            await interaction.deferUpdate();
            return;
        }

        const target = nextPage(parsed.action, parsed.page, HELP_PAGES.length);
        const { embed, row } = buildHelpPage(target);
        await interaction.update({ embeds: [embed], components: [row] });
    }
);
