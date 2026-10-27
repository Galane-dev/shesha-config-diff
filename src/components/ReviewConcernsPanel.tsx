import { SearchOutlined } from '@ant-design/icons';
import { Alert, Empty, Input, Segmented, Select, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { REVIEW_RULE_LABELS, REVIEW_STATUS_LABELS } from '../constants/review';
import { useAppStyles } from '../styles/use-app-styles';
import { useReviewStyles } from '../styles/use-review-styles';
import type { ReviewRule, ReviewStatus } from '../types/review';
import type { IUploadedForm } from '../types/shesha-form';
import { compareReviews } from '../utils/review/compare-reviews';
import { ReviewFindingDetails } from './ReviewFindingDetails';

interface IReviewConcernsPanelProps {
  afterForm: IUploadedForm;
  beforeForm: IUploadedForm;
}

const ReviewConcernsPanel = ({
  afterForm,
  beforeForm,
}: IReviewConcernsPanelProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();
  const { styles: reviewStyles } = useReviewStyles();
  const report = useMemo(
    () => compareReviews(beforeForm.form, afterForm.form),
    [beforeForm, afterForm],
  );
  const [status, setStatus] = useState<ReviewStatus | 'all'>('all');
  const [rule, setRule] = useState<ReviewRule | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const findings = report.findings.filter(
    (finding) =>
      (status === 'all' || finding.status === status) &&
      (rule === 'all' || finding.rule === rule) &&
      `${finding.title} ${finding.script.label} ${finding.script.path}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0];
  const statuses = Object.entries(REVIEW_STATUS_LABELS) as [ReviewStatus, string][];

  return (
    <section aria-label="Review concerns">
      <div className={reviewStyles.header}>
        <div>
          <Typography.Text strong>Review findings</Typography.Text>
          <Typography.Text type="secondary" className={reviewStyles.disclaimer}>
            Potential concerns, not confirmed bugs.
          </Typography.Text>
        </div>
        <Space size={4} wrap>
          <Typography.Text type="secondary">After: {report.scriptCount} scripts</Typography.Text>
          {report.configurationCount > 0 && (
            <Typography.Text type="secondary">
              {report.configurationCount} configuration values
            </Typography.Text>
          )}
          {statuses.map(([key, label]) => (
            <Tag key={key}>
              {label}: {report.findings.filter((finding) => finding.status === key).length}
            </Tag>
          ))}
        </Space>
      </div>
      {report.limitations.length > 0 && (
        <Alert
          title="Some scripts could not be checked"
          showIcon
          type="warning"
          description={
            <ul>
              {report.limitations.map((item, index) => (
                <li key={index}>
                  {item.side}: {item.label}. {item.reason}
                </li>
              ))}
            </ul>
          }
        />
      )}
      <div className={reviewStyles.controls}>
        <Segmented<ReviewStatus | 'all'>
          aria-label="Finding status"
          onChange={setStatus}
          size="small"
          value={status}
          options={[
            { label: 'All', value: 'all' },
            ...statuses.map(([value, label]) => ({ label, value })),
          ]}
        />
        <Select<ReviewRule | 'all'>
          aria-label="Finding type"
          onChange={setRule}
          value={rule}
          virtual={false}
          getPopupContainer={(trigger: HTMLElement): HTMLElement =>
            trigger.parentElement ?? trigger
          }
          options={[
            { label: 'All types', value: 'all' },
            ...Object.entries(REVIEW_RULE_LABELS).map(([value, label]) => ({ label, value })),
          ]}
        />
        <Input
          allowClear
          aria-label="Search review findings"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search findings"
          prefix={<SearchOutlined />}
          value={search}
        />
      </div>
      {report.findings.length === 0 ? (
        <div className={styles.detailEmpty}>
          <Empty description="No review findings in recognised scripts or configuration" />
        </div>
      ) : findings.length === 0 ? (
        <div className={styles.detailEmpty}>
          <Empty description="No matching findings" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div className={cx(styles.workspaceGrid, reviewStyles.grid)}>
          <nav
            aria-label="Review findings"
            className={cx(styles.changeList, reviewStyles.findingsList)}
          >
            {findings.map((finding) => (
              <button
                aria-current={finding.id === selected?.id ? 'true' : undefined}
                className={cx(
                  styles.changeListItem,
                  finding.id === selected?.id && styles.changeListItemActive,
                )}
                key={finding.id}
                onClick={() => setSelectedId(finding.id)}
                type="button"
              >
                <span className={styles.changeListTitle} title={finding.title}>
                  {finding.title}
                </span>
                <span className={reviewStyles.location} title={finding.script.label}>
                  {finding.script.label}
                </span>
                <span className={styles.changeListMeta}>
                  <span>
                    {finding.side} | Line {finding.line}
                  </span>
                  <Space size={4}>
                    <Tag color={finding.rule === 'console-usage' ? 'blue' : 'gold'}>
                      {finding.rule === 'console-usage' ? 'Info' : 'Warning'}
                    </Tag>
                    <Tag>{REVIEW_STATUS_LABELS[finding.status]}</Tag>
                  </Space>
                </span>
              </button>
            ))}
          </nav>
          <ReviewFindingDetails finding={selected} />
        </div>
      )}
    </section>
  );
};

export default ReviewConcernsPanel;
