import { CodeOutlined } from '@ant-design/icons';
import { Collapse, Empty, Segmented, Space, Tag, Typography } from 'antd';
import type { CollapseProps } from 'antd';
import { useState } from 'react';
import type { DiffViewMode } from '../types/diff';
import type { IDiffSelection } from '../types/ui';
import { useAppStyles } from '../styles/use-app-styles';
import { groupChanges } from '../utils/diff/group-changes';
import type { IChangePanel } from '../utils/diff/group-changes';
import { ChangeTypeTag } from './ChangeTypeTag';
import { ValueComparison } from './ValueComparison';

interface IChangeDetailsProps {
  selection?: IDiffSelection;
}

const createCollapseItems = (panels: IChangePanel[], viewMode: DiffViewMode): CollapseProps['items'] =>
  panels.map((panel) => ({
    children: panel.change ? (
      <ValueComparison
        after={panel.change.after}
        before={panel.change.before}
        isScript={panel.change.isScript}
        viewMode={viewMode}
      />
    ) : (
      <Collapse
        defaultActiveKey={[panel.children[0]?.key ?? '']}
        ghost
        items={createCollapseItems(panel.children, viewMode)}
        size="small"
        styles={{ body: { padding: '0 0 8px 4px' }, header: { paddingInline: 4 } }}
      />
    ),
    key: panel.key,
    label: (
      <Space size={8} wrap>
        {panel.change?.isScript && <CodeOutlined />}
        <Typography.Text title={panel.path} style={{ overflowWrap: 'anywhere' }}>{panel.label}</Typography.Text>
        {panel.change ? <Tag>{panel.change.changeType}</Tag> : (
          <Tag>{panel.changeCount} {panel.changeCount === 1 ? 'change' : 'changes'}</Tag>
        )}
      </Space>
    ),
  }));

export const ChangeDetails = ({ selection }: IChangeDetailsProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const [viewMode, setViewMode] = useState<DiffViewMode>('side-by-side');

  if (!selection) {
    return (
      <div className={styles.detailEmpty}>
        <Empty description="Select a change" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const component = selection.component;
  const panels = component ? groupChanges(component.propertyChanges) : [];

  return (
    <article className={styles.changeDetail}>
      <div className={styles.changeHeader}>
        <div>
          <Typography.Title level={3} style={{ fontSize: 17, margin: 0 }}>
            {selection.label}
          </Typography.Title>
          <span className={styles.detailPath} title={selection.value?.path}>
            {component?.path ?? (selection.value?.groups?.length ? selection.description : selection.value?.path)}
          </span>
          {component?.previousPath && (
            <span className={styles.detailPath}>Previously: {component.previousPath}</span>
          )}
        </div>
        <ChangeTypeTag changeType={selection.changeType} />
      </div>

      <div className={styles.diffViewToolbar}>
        <Segmented<DiffViewMode>
          aria-label="Diff view"
          onChange={setViewMode}
          options={[
            { label: 'Side by Side', value: 'side-by-side' },
            { label: 'Inline', value: 'inline' },
          ]}
          size="small"
          value={viewMode}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        {selection.value && (
          <ValueComparison
            after={selection.value.after}
            before={selection.value.before}
            isScript={selection.value.isScript}
            viewMode={viewMode}
          />
        )}

        {component && component.propertyChanges.length > 0 && (
          <Collapse
            key={component.id}
            defaultActiveKey={[panels[0]?.key ?? '']}
            items={createCollapseItems(panels, viewMode)}
            size="small"
          />
        )}

        {component && component.propertyChanges.length === 0 && (
          <ValueComparison after={component.after} before={component.before} viewMode={viewMode} />
        )}
      </div>
    </article>
  );
};
