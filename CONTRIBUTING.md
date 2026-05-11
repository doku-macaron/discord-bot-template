# Contributing

This repository is maintained through pull requests.

## Workflow

1. Update `main`.

    ```sh
    git switch main
    git pull --ff-only origin main
    ```

2. Create a feature branch.

    ```sh
    git switch -c feat/my-change
    ```

3. Keep changes focused and commit them with a short message.

4. Run checks before pushing.

    ```sh
    bun run check:no-save
    bun run check:tsc
    bun test
    ```

5. Push and open a pull request to `main`.

    ```sh
    git push -u origin feat/my-change
    gh pr create --draft --base main --head feat/my-change
    ```

## Layer responsibilities

The project layers code by concern. New code should go into the directory that matches its responsibility.

- `src/events/` — Discord event adapters. The boundary that receives `Interaction`, `Guild`, `Message`, etc. from discord.js and hands work off to the rest of the system.
- `src/framework/` — Reusable framework primitives. Handlers, dispatchers, the job runner, and other building blocks that an item or a usecase can plug into. No app-specific behavior lives here.
- `src/usecases/` — Application behavior and orchestration. Pure of discord.js: usecases receive primitive inputs (IDs, strings, plain DTOs) and return primitive results.
- `src/db/query/` — Persistence operations. Drizzle-based queries and small data-access helpers.
- `src/lib/` — Cross-cutting helpers used across layers (logging, result handling, Discord formatting utilities, infrastructure glue).

### Dependency direction

Dependencies are one-directional. Higher layers reference lower layers; the reverse is not allowed.

```txt
events    -> usecases
events    -> framework
usecases  -> db/query
usecases  -> lib
items/register -> framework public API
framework -> lib
```

- `src/framework/` MUST NOT import from `src/events/` or `src/usecases/`.
- `src/db/query/` MUST NOT import from `src/usecases/` or `src/events/`.
- Items / registers under `src/events/` consume `src/framework/` only through its public barrel exports (e.g. `@/framework/discord/interactions/chatInput`), not through deep paths.
- Same-layer horizontal coupling between unrelated features should also be avoided.

### discord.js stays at the boundary

Do not pass discord.js objects (`Interaction`, `Guild`, `Message`, builders, …) into `src/usecases/`. The events layer is responsible for extracting the values a usecase needs and feeding them in as primitives or plain DTOs.

- The event adapter or item reads `interaction.user.id`, `interaction.options.getString(...)`, etc., and calls a usecase with those values.
- A usecase returns plain data (DTOs, IDs, `Result` tags). The caller (the item) translates that back into a discord.js reply, builder, or component tree.
- This keeps usecases testable without mocking discord.js and confines the Discord SDK surface to `src/events/` and `src/framework/`.

## Naming conventions

The framework directory uses small file-naming rules that show up in `src/framework/discord/interactions/` and `src/framework/jobs/`.

- **Class file** uses the lowerCamelCase form of the class name. `commandHandler.ts` defines `CommandHandler` and the public interaction types (`Command`, `CommandWithSubCommand`, …).
- **Singleton file** appends `Instance`. `commandHandlerInstance.ts` exports the single `commandHandler` value used at runtime. Keeping the class file and its instance file paired by stem makes them group together in directory listings.
- **Singleton export name** matches the type name in lowerCamelCase (`commandHandler: CommandHandler`, `buttonHandler: ButtonHandler`, …).
- **Barrel `index.ts`** in each interaction subdirectory re-exports both the class and the singleton, so consumers import from `@/framework/discord/interactions/<kind>` rather than from the deep files. See [src/framework/discord/interactions/chatInput/index.ts](src/framework/discord/interactions/chatInput/index.ts) for the pattern.
- **`setup.ts`** at [src/events/interactionCreate/setup.ts](src/events/interactionCreate/setup.ts) is the interaction subsystem's composition root: it runs each `*Register.ts` for its side effects and composes `dispatchInteraction` from the framework. The generic name is intentional — the file is the wiring point, not just a registry.
- **`*UseCase.ts`** under `src/usecases/` is the application behavior unit (e.g. [saveMemberProfileUseCase.ts](src/usecases/member/saveMemberProfileUseCase.ts)). The exported function shares the file stem (`saveMemberProfileUseCase`) so call sites read naturally.

When in doubt, copy the closest existing pattern.

## Test placement

Keep framework tests out of the everyday implementation surface.

- Framework and routing tests live next to the framework code under `src/framework/**/__tests__/`.
  - `src/framework/discord/interactions/chatInput/__tests__/`
  - `src/framework/discord/interactions/autocomplete/__tests__/`
  - `src/framework/discord/interactions/contextMenu/__tests__/`
  - `src/framework/discord/interactions/components/__tests__/`
  - `src/framework/jobs/__tests__/`
- Small utility, Discord helper, and infrastructure tests stay next to the file they cover.
  - `src/lib/util/result.ts` and `src/lib/util/result.test.ts`
  - `src/lib/discord/pagination.ts` and `src/lib/discord/pagination.test.ts`
  - `src/lib/infra/logger.ts` and related infrastructure tests
- Database schema and transaction smoke tests stay close to the database code.
  - `src/db/schema/schema.test.ts`
  - `src/db/transaction.test.ts`
- If a command/component/job item grows enough to need its own behavior test, prefer colocating that test with the item first. Move item tests into an `items/__tests__/` directory only if the `items/` directory becomes noisy.

In short: framework tests go to `src/framework/**/__tests__/`; focused unit tests for small modules can stay beside the module.

## PR checklist

- The change is scoped to one purpose.
- Tests or docs were updated when behavior changed.
- `bun run check:no-save`, `bun run check:tsc`, and `bun test` pass.
- Docker changes include `docker compose config` and `docker build` verification.
- Schema changes include generated files in `drizzle/` and a forward-only migration plan.
