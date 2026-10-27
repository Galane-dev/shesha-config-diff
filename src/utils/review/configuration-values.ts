import type { ReviewRule } from '../../types/review';

interface IConfigurationRisk {
  rule: ReviewRule;
  title: string;
  message: string;
  redact: boolean;
}

const SECRET_FIELD =
  /(?:password|passwd|secret|apikey|clientsecret|accesskey|accesstoken|refreshtoken|authorization|privatekey|connectionstring|sastoken|token)$/i;
const SECRET_VALUE =
  /^\s*Bearer\s+(?!\$\{|\{\{)\S{8,}\s*$|\bsk-[a-z0-9_-]{16,}\b|\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:Password|Pwd)\s*=\s*[^;\s]+/i;
const PLACEHOLDER =
  /^(?:\s*|\*+|\[redacted\]|<[^>]+>|\$\{[^}]+\}|\{\{[^}]+\}\}|(?:your|replace|insert|example|placeholder|change)[\s_-]*(?:api[\s_-]*)?(?:key|secret|token|password|me)(?:[\s_-]*here)?)$/i;
const TEST_ENVIRONMENT =
  /(?:^|[./_-])(?:dev|development|test|testportal|testing|qa|uat|sandbox|staging|stage|demo)(?=$|[./_-])/i;

export const isSecretField = (property: string): boolean =>
  SECRET_FIELD.test(property.replace(/[_\s.-]/g, ''));

export const inspectConfigurationValue = (value: string, property = ''): IConfigurationRisk[] => {
  const risks: IConfigurationRisk[] = [];
  let hasCredential =
    !PLACEHOLDER.test(value.trim().replace(/^Bearer\s+/i, '')) &&
    (isSecretField(property) || SECRET_VALUE.test(value));
  let url: URL | undefined;
  if (/^https?:\/\//i.test(value.trim())) {
    try {
      url = new URL(value.trim());
    } catch {
      // A templated or incomplete URL cannot be resolved statically.
    }
  }
  if (url) {
    // Names such as apiUrlToken describe token endpoints, not credential values.
    if (/url|uri|endpoint/i.test(property)) {
      hasCredential = SECRET_VALUE.test(value);
    }
    hasCredential ||=
      Boolean(url.username || url.password) ||
      [...url.searchParams.keys()].some(
        (key) => isSecretField(key) && !PLACEHOLDER.test(url?.searchParams.get(key) ?? ''),
      );
    const isLoopback =
      url.hostname === 'localhost' ||
      url.hostname.endsWith('.localhost') ||
      url.hostname === '[::1]' ||
      /^127\./.test(url.hostname);
    if (isLoopback || TEST_ENVIRONMENT.test(`${url.hostname}${url.pathname}`)) {
      risks.push({
        rule: 'test-url',
        title: 'Possible hardcoded test URL',
        redact: false,
        message:
          'This static URL contains a local or test-environment marker. Confirm that it belongs to the intended deployment; the hostname alone does not prove a misconfiguration.',
      });
    }
    if (url.protocol === 'http:' && !isLoopback) {
      risks.push({
        rule: 'insecure-http',
        title: 'Insecure HTTP URL',
        redact: false,
        message:
          'This static remote URL uses HTTP rather than HTTPS. Review whether credentials or personal data could be sent without transport encryption.',
      });
    }
  }
  if (hasCredential) {
    risks.push({
      rule: 'embedded-credential',
      title: 'Possible embedded credential',
      redact: true,
      message:
        'A static value looks like a credential or is assigned to a credential-like field. Check whether it is a secret or an intentionally public/restricted client key before changing it. Known values are masked in review evidence.',
    });
  }
  return risks;
};
