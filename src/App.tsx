import { Alert, App as AntApp, ConfigProvider, Typography } from 'antd';
import { lazy, Suspense, useMemo, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { ComparisonEmptyState } from './components/ComparisonEmptyState';
import { DiffSummary } from './components/DiffSummary';
import { DiffWorkspace } from './components/DiffWorkspace';
import { UploadSection } from './components/UploadSection';
import { APP_THEME } from './constants/theme';
import { useAiSettings } from './hooks/use-ai-settings';
import { useAppStyles } from './styles/use-app-styles';
import type { IUploadedForm } from './types/shesha-form';
import { compareForms } from './utils/diff/compare-forms';
import { readSheshaFormFile } from './utils/files/parse-form-file';

const AiSettingsDrawer = lazy(() => import('./components/AiSettingsDrawer'));

interface IFileSlotState {
  error?: string;
  form?: IUploadedForm;
}

export const App = (): React.JSX.Element => {
  const { styles } = useAppStyles();
  const [beforeSlot, setBeforeSlot] = useState<IFileSlotState>({});
  const [afterSlot, setAfterSlot] = useState<IFileSlotState>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings, clearAiKey] = useAiSettings();
  const diff = useMemo(
    () => beforeSlot.form && afterSlot.form
      ? compareForms(beforeSlot.form, afterSlot.form)
      : undefined,
    [afterSlot.form, beforeSlot.form],
  );
  const isDifferentConfiguration = Boolean(
    beforeSlot.form?.metadata.configName &&
    afterSlot.form?.metadata.configName &&
    beforeSlot.form.metadata.configName !== afterSlot.form.metadata.configName,
  );

  const loadFile = async (
    file: File,
    setSlot: React.Dispatch<React.SetStateAction<IFileSlotState>>,
  ): Promise<void> => {
    setSlot({});
    const result = await readSheshaFormFile(file);
    setSlot(result.uploadedForm ? { form: result.uploadedForm } : { error: result.error });
  };

  const clearAll = (): void => {
    setBeforeSlot({});
    setAfterSlot({});
  };

  return (
    <ConfigProvider theme={APP_THEME}>
      <AntApp>
        <div className={styles.app}>
          <AppHeader onOpenSettings={() => setIsSettingsOpen(true)} />

          <main className={styles.appContent}>
            <UploadSection
              afterError={afterSlot.error}
              afterForm={afterSlot.form}
              beforeError={beforeSlot.error}
              beforeForm={beforeSlot.form}
              onClear={clearAll}
              onClearAfter={() => setAfterSlot({})}
              onClearBefore={() => setBeforeSlot({})}
              onSelectAfter={(file) => { void loadFile(file, setAfterSlot); }}
              onSelectBefore={(file) => { void loadFile(file, setBeforeSlot); }}
              onSwap={() => {
                setBeforeSlot(afterSlot);
                setAfterSlot(beforeSlot);
              }}
            />

            {isDifferentConfiguration && (
              <Alert
                message="The export names differ. Confirm that these files represent the same form before reviewing the result."
                showIcon
                style={{ marginBottom: 12 }}
                type="warning"
              />
            )}

            {diff && beforeSlot.form && afterSlot.form ? (
              <>
                <DiffSummary diff={diff} />
                <DiffWorkspace
                  afterForm={afterSlot.form}
                  aiSettings={aiSettings}
                  beforeForm={beforeSlot.form}
                  diff={diff}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </>
            ) : (
              <ComparisonEmptyState />
            )}
          </main>

          <footer className={styles.footer}>
            <Typography.Text type="secondary">
              Comparisons run locally. Form context is sent only when an AI review is requested.
            </Typography.Text>
            <Typography.Text type="secondary">Open source · No backend</Typography.Text>
          </footer>
        </div>

        {isSettingsOpen && (
          <Suspense fallback={null}>
            <AiSettingsDrawer
              onClearKey={clearAiKey}
              onClose={() => setIsSettingsOpen(false)}
              onSave={setAiSettings}
              settings={aiSettings}
            />
          </Suspense>
        )}
      </AntApp>
    </ConfigProvider>
  );
};
