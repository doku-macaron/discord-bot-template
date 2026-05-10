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

## PR checklist

- The change is scoped to one purpose.
- Tests or docs were updated when behavior changed.
- `bun run check:no-save`, `bun run check:tsc`, and `bun test` pass.
- Docker changes include `docker compose config` and `docker build` verification.
- Schema changes include generated files in `drizzle/` and a forward-only migration plan.
