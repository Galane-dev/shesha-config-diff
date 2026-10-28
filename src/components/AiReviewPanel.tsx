import { ReloadOutlined, RobotOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';
import { AI_PROVIDERS } from '../constants/ai-providers';
import { useAiReview } from '../hooks/use-ai-review';
import { useAiReviewStyles } from '../styles/use-ai-review-styles';
import type { IAiSettings } from '../types/ai';
import type { IFormDiff } from '../types/diff';
import type { ISheshaFormExport } from '../types/shesha-form';
import { createReviewRequest } from '../utils/ai/create-review-request';
import { AiReviewResult } from './AiReviewResult';

interface IAiReviewPanelProps {
  diff: IFormDiff;
  latestForm: ISheshaFormExport;
  onOpenSettings: () => void;
  settings: IAiSettings;
}

export const AiReviewPanel = ({
  diff,
  latestForm,
  onOpenSettings,
  settings,
}: IAiReviewPanelProps): React.JSX.Element => {
  const { styles } = useAiReviewStyles();
  const request = useMemo(() => createReviewRequest(diff, latestForm), [diff, latestForm]);
  const { error, isLoading, result, generate, cancel } = useAiReview(request, settings);
  const isConfigured = Boolean(settings.apiKey && settings.endpoint && settings.model);
  const provider =
    AI_PROVIDERS.find((item) => item.id === settings.provider)?.label ?? settings.provider;

  if (!isConfigured) {
    return (
      <div className={styles.panel}>
        <Empty description="No AI provider configured" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button icon={<SettingOutlined aria-hidden="true" />} onClick={onOpenSettings}>
            Configure provider
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <section aria-label="AI form review" className={styles.panel}>
      <div className={styles.header}>
        <div>
          <Typography.Title level={3} style={{ fontSize: 17, margin: 0 }}>
            Latest form review
          </Typography.Title>
          <Typography.Text className={styles.metadata}>
            {provider} | {settings.model}
          </Typography.Text>
        </div>
        <div className={styles.toolbar}>
          <Button
            icon={
              result ? <ReloadOutlined aria-hidden="true" /> : <RobotOutlined aria-hidden="true" />
            }
            loading={isLoading}
            onClick={() => {
              void generate();
            }}
            type="primary"
          >
            {result ? 'Regenerate review' : 'Review latest form'}
          </Button>
          {isLoading && (
            <Button icon={<StopOutlined aria-hidden="true" />} onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button icon={<SettingOutlined aria-hidden="true" />} onClick={onOpenSettings}>
            Provider settings
          </Button>
        </div>
      </div>

      <div className={styles.request}>
        <Typography.Text type="secondary">
          On request, redacted After-form context, the diff and local review findings are sent to{' '}
          {provider}. Redaction is best-effort.
        </Typography.Text>
        <details className={styles.source}>
          <summary>
            Request context | {request.targets.length} locations | {request.redactionCount}{' '}
            redactions
          </summary>
          <pre aria-label="Redacted AI request" tabIndex={0}>
            {request.payload}
          </pre>
        </details>
      </div>

      {request.wasTruncated && (
        <Alert
          title="Partial review context"
          description={`${request.omittedTargets} locations omitted; long values or change details may be shortened. Suggestions apply only to supplied context.`}
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
        />
      )}
      {error && <Alert title={error} showIcon type="error" role="alert" />}
      {isLoading ? (
        <div role="status" aria-live="polite">
          <Typography.Text type="secondary">Reviewing latest form...</Typography.Text>
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        </div>
      ) : result ? (
        <AiReviewResult review={result} targets={request.targets} />
      ) : (
        !error && <Empty description="No AI review yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </section>
  );
};

export default AiReviewPanel;
