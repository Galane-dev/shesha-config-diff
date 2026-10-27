import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Form, Input, Select, Typography } from 'antd';
import { useState } from 'react';
import { AI_PROVIDERS } from '../constants/ai-providers';
import type { IAiSettings, AiProviderId } from '../types/ai';
import { useAppStyles } from '../styles/use-app-styles';

interface IAiSettingsDrawerProps {
  onClear: () => void;
  onClose: () => void;
  onSave: (settings: IAiSettings) => void;
  settings: IAiSettings;
}

export const AiSettingsDrawer = ({
  onClear,
  onClose,
  onSave,
  settings,
}: IAiSettingsDrawerProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const [draft, setDraft] = useState(settings);
  const provider = AI_PROVIDERS.find((item) => item.id === draft.provider);
  const isComplete = Boolean(draft.apiKey.trim() && draft.endpoint.trim() && draft.model.trim());

  const handleProviderChange = (providerId: AiProviderId): void => {
    const definition = AI_PROVIDERS.find((item) => item.id === providerId);

    setDraft((current) => ({
      ...current,
      endpoint: definition?.defaultEndpoint ?? '',
      model: definition?.defaultModel ?? '',
      provider: providerId,
    }));
  };

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open
      title="AI provider settings"
      width={440}
    >
      <Alert
        description="The key is stored unencrypted in this browser's local storage. Use this option only on a trusted device."
        message="Local browser storage"
        showIcon
        style={{ marginBottom: 20 }}
        type="warning"
      />

      <Form layout="vertical">
        <Form.Item label="Provider" required>
          <Select<AiProviderId>
            onChange={handleProviderChange}
            options={AI_PROVIDERS.map((item) => ({ label: item.label, value: item.id }))}
            value={draft.provider}
          />
        </Form.Item>

        <Form.Item label="Model" required>
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
            placeholder={provider?.modelPlaceholder}
            value={draft.model}
          />
        </Form.Item>

        <Form.Item label="Endpoint" required>
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))}
            placeholder="https://..."
            value={draft.endpoint}
          />
        </Form.Item>

        <Form.Item label="API key" required>
          <Input.Password
            autoComplete="off"
            onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
            placeholder="Stored on this device"
            value={draft.apiKey}
          />
        </Form.Item>
      </Form>

      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Provider requests are sent directly from your browser. Some custom endpoints may reject browser requests.
      </Typography.Paragraph>

      <div className={styles.settingsFooter}>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            onClear();
            onClose();
          }}
          type="text"
        >
          Clear settings
        </Button>
        <Button
          disabled={!isComplete}
          icon={<SaveOutlined />}
          onClick={() => {
            onSave({
              ...draft,
              apiKey: draft.apiKey.trim(),
              endpoint: draft.endpoint.trim(),
              model: draft.model.trim(),
            });
            onClose();
          }}
          type="primary"
        >
          Save
        </Button>
      </div>
    </Drawer>
  );
};

export default AiSettingsDrawer;
