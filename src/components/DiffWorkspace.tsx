import { AuditOutlined, CodeOutlined, FileSearchOutlined, RobotOutlined } from '@ant-design/icons';
import { Empty, Spin, Tabs } from 'antd';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { IAiSettings } from '../types/ai';
import type { DiffFilter, IFormDiff } from '../types/diff';
import type { IUploadedForm } from '../types/shesha-form';
import { useAppStyles } from '../styles/use-app-styles';
import { createDiffSelections } from '../utils/diff/create-selections';
import { ChangeDetails } from './ChangeDetails';
import { ChangeNavigation } from './ChangeNavigation';

const AiReviewPanel = lazy(() => import('./AiReviewPanel'));
const RawComparison = lazy(() => import('./RawComparison'));
const ReviewConcernsPanel = lazy(() => import('./ReviewConcernsPanel'));

interface IDiffWorkspaceProps {
  afterForm: IUploadedForm;
  aiSettings: IAiSettings;
  beforeForm: IUploadedForm;
  diff: IFormDiff;
  onOpenSettings: () => void;
}

export const DiffWorkspace = ({
  afterForm,
  aiSettings,
  beforeForm,
  diff,
  onOpenSettings,
}: IDiffWorkspaceProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const [filter, setFilter] = useState<DiffFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const selections = useMemo(
    () => createDiffSelections(diff, filter, searchText),
    [diff, filter, searchText],
  );
  const activeSelection = selections.find((selection) => selection.id === selectedId) ?? selections[0];

  const changesContent = diff.hasChanges ? (
    <div className={styles.workspaceGrid}>
      <ChangeNavigation
        filter={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearchText}
        onSelect={setSelectedId}
        searchText={searchText}
        selectedId={activeSelection?.id}
        selections={selections}
      />
      <ChangeDetails selection={activeSelection} />
    </div>
  ) : (
    <div className={styles.detailEmpty}>
      <Empty description="No configuration differences found" />
    </div>
  );

  return (
    <div className={styles.workspace}>
      <Tabs
        defaultActiveKey="changes"
        items={[
          {
            children: changesContent,
            icon: <FileSearchOutlined />,
            key: 'changes',
            label: 'Changes',
          },
          {
            children: (
              <Suspense fallback={<Spin fullscreen={false} />}>
                <ReviewConcernsPanel afterForm={afterForm} beforeForm={beforeForm} />
              </Suspense>
            ),
            icon: <AuditOutlined />,
            key: 'review',
            label: 'Review Concerns',
          },
          {
            children: (
              <Suspense fallback={<Spin fullscreen={false} />}>
                <RawComparison afterForm={afterForm} beforeForm={beforeForm} />
              </Suspense>
            ),
            icon: <CodeOutlined />,
            key: 'raw',
            label: 'Raw JSON',
          },
          {
            children: (
              <Suspense fallback={<Spin fullscreen={false} />}>
                <AiReviewPanel
                  diff={diff}
                  latestForm={afterForm.form}
                  onOpenSettings={onOpenSettings}
                  settings={aiSettings}
                />
              </Suspense>
            ),
            icon: <RobotOutlined aria-hidden="true" />,
            key: 'ai',
            label: 'AI review',
          },
        ]}
        tabBarStyle={{ margin: 0, paddingInline: 16 }}
      />
    </div>
  );
};
