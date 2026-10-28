# Shesha Config Diff

A local-first visual comparison tool for exported [Shesha](https://github.com/shesha-io/shesha-framework) form configurations.

![Shesha Config Diff workspace](docs/screenshot.png)

## What It Does

- Compares two exported Shesha form JSON files in the browser.
- Matches nested components primarily by stable Shesha component ID.
- Separates component, form-setting, script, expression, and ordering changes.
- Ignores object-key ordering while preserving meaningful array ordering.
- Switches between Side by Side and Inline views for settings, scripts, validators, and dynamic expressions, with additions and removals highlighted.
- Reviews recognised scripts and static configuration for logging, failure handling, async completion, runtime access, syntax and configuration concerns in a separate **Review Concerns** tab.
- Exports a deterministic Markdown report for reviews and pull requests.
- Optionally asks a user-selected AI provider for a concise change summary, improvements and edge cases based on the latest form.

The deterministic comparison is always the source of truth. AI review is optional and does not decide whether two exports differ.

## Privacy Model

There is no application backend.

- Form parsing and comparison run entirely in the browser.
- Uploaded files are not persisted and are cleared when the page is closed or refreshed.
- Only non-secret AI preferences (provider, model, and endpoint) are saved in browser local storage.
- The API key stays in memory only. Refreshing or closing the page forgets it; **Clear key** removes it from the active settings without resetting saved preferences.
- An AI request is made only when the user selects **Review latest form** or **Regenerate review**.
- The request includes a redacted diff, bounded After-form configuration context (including unchanged components/settings), and selected local review findings. This is broader than diff-only sharing. The original export file is not uploaded as a file, but its configuration content is included in the derived context.
- Inspect **Request context** before sending. Credential redaction is best-effort, not a guarantee: remove personal data and secrets from exports before sharing with any provider.

Memory-only storage reduces persistent exposure; it does not hide the key from page scripts, privileged browser extensions, device malware, or browser request inspection while it is in use. Use a trusted device and browser, and send keys only to trusted HTTPS provider endpoints. Use a dedicated, restricted key and provider-supported usage controls. If a key may have been exposed, revoke or rotate it with the provider; clearing it here does not revoke it.

A provider may also reject direct browser requests because of its CORS policy. Do not route keys through an untrusted proxy to bypass that restriction. See [SECURITY.md](SECURITY.md) for further precautions.

## Supported Export Shape

The current comparer expects the standard Shesha form export structure:

```json
{
  "components": [],
  "formSettings": {}
}
```

Files with duplicate or missing component IDs are accepted with warnings. Components without IDs fall back to location-based matching, which is less reliable after large structural edits.

Component discovery includes direct children, wizard steps, tabs, columns, and panel header/content slots. Child changes are listed individually; parent comparisons retain the container settings without duplicating its child definitions.

Scripts inside action/configuration arrays have their own diffs under the owning component. Configured items, buttons, and actions are grouped by their names, with changed settings and scripts nested underneath. Wizard steps show their number and configured title (falling back to label, name, or just the number). Numbers use the After order, or the Before order for removed steps. Array items are matched by ID or key where available (otherwise by position); ordering changes are shown separately. Exact configuration paths remain available on hover and in exported reports.

Table entries also use column captions, dialog titles, bound property names, or action names when a button label is unavailable.

## Review Concerns

This read-only review runs locally using Acorn's JavaScript parser and AST walker. Uploaded scripts are never executed. Findings remain separate from configuration-diff counts and the Markdown diff report; AI is not used for these checks.

- **Console usage:** direct calls such as `console.log`, `console.error`, static bracket access, and supported browser-global equivalents. Comments, string contents, and locally declared `console` objects are not treated as browser console calls. `console.error` is logging, not a thrown exception.
- **Sensitive logging:** heuristics for full form/request objects and personal or secret-looking arguments, including email, mobile and password fields. A warning is a review prompt, not proof that sensitive information is present or exposed.
- **Failure handling:** empty catch blocks and inline or locally declared rejection handlers that only log. Explicit recovery values, feedback and rethrows are not classified as logging-only recovery.
- **Promises and completion:** detached known HTTP/fetch/Promise calls without rejection handling, and requests that completion-sensitive hooks do not wait for. Simple promise variables, returned/awaited chains, combinators and inline wrappers are recognised. Ordinary callbacks, unknown consumers and manual Promise executors are treated conservatively; custom control flow may not be understood.
- **Runtime access:** partially guarded optional chains such as `data?.npo.type`, including grouped chains. Fully optional access and common truthy/non-null guards are recognised. The reviewer does not know the model's nullability guarantees or perform full control-flow analysis.
- **Syntax review:** parsing failures with original source locations. Known visibility/edit-mode settings are reviewed as synchronous bodies; form lifecycle hooks and before-navigation wizard actions use asynchronous bodies. Unknown/custom contexts remain permissive about `await`. Shesha-provided variables are not reported as undefined. Context inference does not replace validation against the deployed framework/editor version.
- **Configuration risks:** static local/test URLs, remote HTTP URLs and possible embedded credentials in scripts or plain JSON settings. Environment markers and credential names/formats are heuristics; a public/restricted client key is not necessarily a secret. Obvious placeholders are skipped. No URL is contacted or credential tested.

Both exports are scanned, including unchanged scripts, scripts in added/removed components and suspicious static configuration values. Findings are **New**, **Existing**, or **Resolved**, matched by source identity and parsed statement/static value rather than line number. **Unverified** means a version could not be fully checked, so introduction/resolution cannot be established. Syntax failures stop the other AST checks for that script; scripts or candidate values over 250,000 characters and parser resource limits are explicitly reported as incomplete.

The review recognises explicit `_code` settings and known raw script fields, including lifecycle hooks, action expressions and form arguments. Inactive value-mode code is skipped. It does not fully trace aliases, dynamically computed methods, runtime values or data flow; unknown/custom script fields may not be recognised. No findings does not certify that a form is safe or correct. Detected credential values are masked across review evidence for the same analysed source, preserving source positions. This is not complete redaction: the original upload, Raw JSON, diff report and existing AI behaviour are unchanged. Review screenshots and exports before sharing them.

Script rules live in `src/utils/review/rules/` and share the parser, scope helpers, source locations and finding comparison. Extend `ReviewRule`, add a rule to `SCRIPT_RULES` and its label to `REVIEW_RULE_LABELS`; the existing filters pick up the new category. Static configuration uses the same finding/status format without attempting to parse values as JavaScript.

## AI Review

The **AI review** tab shows a short change summary, up to three suggested improvements, and up to three edge cases with expected behaviour. Recommendations and source context are collapsed initially. Each recommendation must reference a supplied After-form location; expanding it shows the actual redacted source, not AI-generated code.

Before is used only in the change-summary context. Recommendations use the latest After configuration, including unchanged settings/components, with selected current Review Concerns as heuristic evidence. Uploaded text is treated as untrusted data, never executed or followed as instructions. AI can still make mistakes: recommendations are review prompts, not confirmed bugs, and no findings does not certify correctness.

Requests are limited to 60,000 characters, with individual values and locations shortened where necessary. Form-level context and individually extracted scripts/configuration risks are prioritised before component settings; script targets retain their inferred execution context and completion requirements. Partial context and omitted locations are explicitly reported. The request preview shows the actual derived payload. No automatic requests, retries, fixes or persistence of reviews are performed. Cancelling, replacing an export, changing provider settings or clearing the key aborts the active browser request and discards stale results; this cannot withdraw data already received by the provider or guarantee that billing stops.

All four existing providers use the same prompted JSON contract and local validation. Unsupported, malformed, invented-reference or incomplete responses produce an error rather than an unstructured essay. This is deliberately provider-neutral, not a guarantee of schema-constrained generation for every configured model. The OpenAI adapter keeps its existing Responses API transport and `store: false`; see the [official structured-output guidance](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) for provider-specific schema enforcement.

The implementation separates request collection/redaction (`create-review-request.ts`, `sanitize-value.ts`), instructions (`review-prompt.ts`), response validation (`parse-review.ts`), transport (`review-form.ts`), request lifecycle (`use-ai-review.ts`) and presentation (`AiReviewResult.tsx`).

## Local Development

Prerequisites:

- Node.js 24 or later
- npm 11 or later

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run test:e2e
```

## AI Providers

The settings drawer supports:

- OpenAI Responses API
- Anthropic Messages API
- Google Gemini `generateContent`
- OpenAI-compatible chat-completions endpoints

Model names are deliberately entered by the user instead of being hard-coded, because account access and available models change independently of this application.

## GitHub Pages

The Vite build uses relative asset paths and can be hosted from a project subdirectory. The included workflow publishes `dist` to GitHub Pages after a successful push to `main`.

Enable **GitHub Actions** as the Pages source in the repository settings after the repository is created.

## Project Structure

```text
src/
  components/       UI components
  constants/        App, provider, and theme configuration
  hooks/            Reusable React hooks
  styles/           Shared Ant Design styles
  types/            Domain and transport types
  utils/
    ai/              Provider adapters and redaction
    diff/            Deterministic comparison engine
    files/           Export parsing and validation
    forms/           Shared component structure discovery
    report/          Local Markdown report generation
    review/          Local script collection, AST checks and finding comparison
tests/               Unit tests for comparison behavior
e2e/                 Browser workflow tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The project follows the functional TypeScript and Ant Design conventions used by the Shesha frontend, with feature branches and pull-request-based changes.

## License

Licensed under the [Apache License 2.0](LICENSE.md).
