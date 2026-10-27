# Contributing

Thank you for improving Shesha Config Diff.

## Development Flow

1. Create a branch from an up-to-date `main` branch.
2. Make a focused change with tests proportional to its risk.
3. Run all quality checks locally.
4. Open a pull request with the behavior, test evidence, and screenshots for UI changes.

Use one of these branch formats:

```text
users/username/description
bugfix/description
feature/feature-name
feature/feature-area/feature-name
hotfix/description
```

## Code Conventions

- Prefer functional TypeScript, pure helpers, immutable operations, and early returns.
- Keep components small, accessible, and focused on one responsibility.
- Prefix interfaces with `I` and avoid `any`.
- Use explicit return types and strict equality.
- Place reusable types, constants, hooks, and utilities in their existing dedicated folders.
- Use PascalCase for component files and kebab-case for non-component files.
- Match existing Ant Design and `antd-style` patterns before adding a new UI abstraction.
- Preserve Shesha component IDs, array ordering, lifecycle scripts, and dynamic setting objects in comparison logic.

## Quality Checks

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run test:e2e
```

New comparison semantics require focused unit tests. User-facing workflows require an end-to-end test where practical.

## Pull Requests

Keep pull requests small enough to review. Include:

- What changed and why
- Screenshots for visual changes
- Tests run
- Known limitations or follow-up work

Do not commit exported client forms, API keys, tokens, or other sensitive configuration data.
