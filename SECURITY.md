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
- Review the computed diff before sending it to an AI provider.

Memory-only storage does not protect a key from malicious scripts running in the page, sufficiently privileged extensions, device malware, or inspection of outgoing requests. The application cannot reliably detect all such threats. Keys must be available to the browser while authenticating provider requests.

The application redacts common token formats and secret-looking properties before an AI request, but redaction is defensive rather than a guarantee. Never place production secrets in form configuration exports.

## Script Review

Review Concerns parses recognised JavaScript without executing it. It does not use `eval`, construct executable functions, or load uploaded code as modules. Review findings are generated locally and are not automatically sent to an AI provider or added to the diff report.

Sensitive-logging checks are heuristics, not a complete secret scanner or security audit. Script evidence is displayed as literal text, not HTML, and is not redacted in the local review panel. Take care when sharing screenshots or copying script evidence. Parsing failures and resource limits prevent complete analysis; the review must not be interpreted as a safety guarantee.
