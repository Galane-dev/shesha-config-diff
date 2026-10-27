import { DownloadOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Typography } from 'antd';
import type { IFormDiff } from '../types/diff';
import { useAppStyles } from '../styles/use-app-styles';
import { downloadMarkdownReport } from '../utils/report/generate-report';

interface IDiffSummaryProps {
  diff: IFormDiff;
}

export const DiffSummary = ({ diff }: IDiffSummaryProps): React.JSX.Element => {
  const { styles } = useAppStyles();

  return (
    <div className={styles.summaryBar}>
      <div className={styles.summaryTitle}>
        <Typography.Text strong>
          {diff.beforeMetadata.displayName} → {diff.afterMetadata.displayName}
        </Typography.Text>
        <br />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {diff.hasChanges ? `${diff.counts.total} deterministic changes found` : 'The exports are equivalent'}
        </Typography.Text>
      </div>

      <Space wrap size={6}>
        <div className={styles.summaryCounts}>
          <Tag color="green">+{diff.counts.added}</Tag>
          <Tag color="red">−{diff.counts.removed}</Tag>
          <Tag color="gold">~{diff.counts.modified}</Tag>
          <Tag>{diff.counts.components} components</Tag>
          <Tag>{diff.counts.scripts} scripts</Tag>
        </div>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadMarkdownReport(diff)}
          size="small"
        >
          Report
        </Button>
      </Space>
    </div>
  );
};
