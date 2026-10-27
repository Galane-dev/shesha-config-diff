import { RobotOutlined, SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Space, Typography } from 'antd';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { IAiExplanationResult, IAiSettings } from '../types/ai';
import type { IFormDiff } from '../types/diff';
import { useAppStyles } from '../styles/use-app-styles';
import { explainDiff } from '../utils/ai/explain-diff';

interface IAiExplanationPanelProps {
  diff: IFormDiff;
  onOpenSettings: () => void;
  settings: IAiSettings;
}

export const AiExplanationPanel = ({
  diff,
  onOpenSettings,
  settings,
}: IAiExplanationPanelProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IAiExplanationResult>();
  const isConfigured = Boolean(settings.apiKey && settings.endpoint && settings.model);

  const handleExplain = async (): Promise<void> => {
    setError(undefined);
    setIsLoading(true);

    try {
      setResult(await explainDiff(diff, settings));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The provider request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className={styles.aiPanel}>
        <Empty
          description="No AI provider configured"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button icon={<SettingOutlined />} onClick={onOpenSettings}>
            Configure provider
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className={styles.aiPanel}>
      <Space align="start" direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Button
            icon={<RobotOutlined />}
            loading={isLoading}
            onClick={() => { void handleExplain(); }}
            type="primary"
          >
            Explain diff
          </Button>
          <Button icon={<SettingOutlined />} onClick={onOpenSettings}>
            Provider settings
          </Button>
          <Typography.Text type="secondary">
            {settings.provider} · {settings.model}
          </Typography.Text>
        </Space>

        <Alert
          description="Only the computed diff is sent after likely credentials are redacted. Raw form files stay in this browser."
          message="Explicit provider request"
          showIcon
          type="info"
        />

        {error && <Alert message={error} showIcon type="error" />}

        {result && (result.redactionCount > 0 || result.wasTruncated) && (
          <Alert
            message={`${result.redactionCount} sensitive value(s) redacted${result.wasTruncated ? '; payload truncated' : ''}.`}
            showIcon
            type="warning"
          />
        )}

        {result ? (
          <div className={styles.aiContent}>
            <ReactMarkdown>{result.content}</ReactMarkdown>
          </div>
        ) : (
          <Typography.Text type="secondary">
            The deterministic comparison remains the source of truth.
          </Typography.Text>
        )}
      </Space>
    </div>
  );
};

export default AiExplanationPanel;
