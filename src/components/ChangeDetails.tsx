import { CodeOutlined } from '@ant-design/icons';
import { Collapse, Empty, Space, Tag, Typography } from 'antd';
import type { CollapseProps } from 'antd';
import type { IDiffSelection } from '../types/ui';
import { useAppStyles } from '../styles/use-app-styles';
import { ChangeTypeTag } from './ChangeTypeTag';
import { ValueComparison } from './ValueComparison';

interface IChangeDetailsProps {
  selection?: IDiffSelection;
}

const createCollapseItems = (selection: IDiffSelection): CollapseProps['items'] =>
  selection.component?.propertyChanges.map((change) => ({
    children: (
      <ValueComparison after={change.after} before={change.before} isScript={change.isScript} />
    ),
    key: change.id,
    label: (
      <Space size={8} wrap>
        {change.isScript && <CodeOutlined />}
        <Typography.Text code>{change.path}</Typography.Text>
        <Tag>{change.changeType}</Tag>
      </Space>
    ),
  })) ?? [];

export const ChangeDetails = ({ selection }: IChangeDetailsProps): React.JSX.Element => {
  const { styles } = useAppStyles();

  if (!selection) {
    return (
      <div className={styles.detailEmpty}>
        <Empty description="Select a change" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const component = selection.component;

  return (
    <article className={styles.changeDetail}>
      <div className={styles.changeHeader}>
        <div>
          <Typography.Title level={3} style={{ fontSize: 17, margin: 0 }}>
            {selection.label}
          </Typography.Title>
          <span className={styles.detailPath}>
            {component?.path ?? selection.value?.path}
          </span>
          {component?.previousPath && (
            <span className={styles.detailPath}>Previously: {component.previousPath}</span>
          )}
        </div>
        <ChangeTypeTag changeType={selection.changeType} />
      </div>

      <div style={{ marginTop: 18 }}>
        {selection.value && (
          <ValueComparison
            after={selection.value.after}
            before={selection.value.before}
            isScript={selection.value.isScript}
          />
        )}

        {component && component.propertyChanges.length > 0 && (
          <Collapse
            defaultActiveKey={[component.propertyChanges[0]?.id ?? '']}
            items={createCollapseItems(selection)}
            size="small"
          />
        )}

        {component && component.propertyChanges.length === 0 && (
          <ValueComparison after={component.after} before={component.before} />
        )}
      </div>
    </article>
  );
};
