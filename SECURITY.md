# Security Policy

## Reporting A Vulnerability

Please use the repository's private GitHub security advisory feature. Do not disclose a vulnerability or exposed credential in a public issue.

## Local Data And API Keys

This application has no backend. Uploaded forms and AI API keys are held in browser memory. Only non-secret provider preferences (provider, model, and endpoint) are saved in local storage.

API keys are not saved in local storage, session storage, or IndexedDB by the application. Refreshing or closing the page forgets the active key. **Clear key** removes it from active settings while preserving preferences. It does not revoke the provider key, cancel requests already sent, or guarantee erasure from browser memory.

Users should:

- Configure AI only on a trusted device and browser. A separate profile without extensions can reduce exposure.
- Use a dedicated, restricted provider key with appropriate provider-supported usage controls. Never embed a shared key in the application or its build.
- Send keys only to trusted HTTPS endpoints. A custom endpoint receives the supplied key; an untrusted CORS proxy can expose it too.
- Clear the key after use, particularly on a shared device. Avoid sharing screenshots or network logs containing credentials.
- Revoke or rotate a key with its provider if it may have been exposed.
- Inspect the AI request preview before sending. It includes redacted latest-form context, including unchanged configuration, the diff and selected local review findings; it is not limited to changed values.

Memory-only storage does not protect a key from malicious scripts running in the page, sufficiently privileged extensions, device malware, or inspection of outgoing requests. The application cannot reliably detect all such threats. Keys must be available to the browser while authenticating provider requests.

The application redacts common token formats and secret-looking properties before an AI request, but redaction is defensive rather than a guarantee. Never place production secrets in form configuration exports.

AI review is explicitly opt-in. Source context is bounded, and omitted or shortened content is reported. The provider response is parsed and validated locally, displayed as text and restricted to supplied After-form references. No suggested code is executed or automatically applied. Prompt isolation and output validation reduce risk but cannot guarantee factual correctness or prevent all prompt injection. Cancelling aborts the browser request; data already sent cannot be recalled, and the provider may continue processing or charging for it.

## Script Review

Review Concerns parses recognised JavaScript without executing it. It does not use `eval`, construct executable functions, or load uploaded code as modules. Review findings are generated locally and are not automatically sent to an AI provider or added to the diff report.

Sensitive-logging, credential, URL, async and runtime checks are heuristics, not a complete security audit or type/data-flow analysis. They do not contact detected endpoints, test credentials or execute callbacks. Public/restricted browser keys are not automatically private secrets, and environment-like hostnames do not prove a deployment error.

Evidence is displayed as literal text, not HTML. Detected static credential values are masked in review evidence and full-source views, including other findings from that analysed source. Masking preserves line positions but is not comprehensive: malformed/unrecognised code and unsupported formats can escape detection. AI request redaction also has these limitations. Raw JSON, the original files and diff reports are unchanged. Take care when sharing screenshots, exports or copied evidence. Parsing failures and resource limits prevent complete analysis; no findings must not be interpreted as a safety guarantee.
