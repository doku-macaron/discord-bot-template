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
