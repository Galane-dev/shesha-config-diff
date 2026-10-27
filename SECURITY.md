# Security Policy

## Reporting A Vulnerability

Please use the repository's private GitHub security advisory feature. Do not disclose a vulnerability or exposed credential in a public issue.

## Local Data And API Keys

This application has no backend. Uploaded forms are processed in browser memory. Saved AI provider settings, including API keys, are stored unencrypted in browser local storage.

Users should:

- Configure AI only on a trusted device.
- Use a restricted provider key with appropriate usage limits.
- Clear AI settings after using a shared device.
- Review the computed diff before sending it to an AI provider.

The application redacts common token formats and secret-looking properties before an AI request, but redaction is defensive rather than a guarantee. Never place production secrets in form configuration exports.
