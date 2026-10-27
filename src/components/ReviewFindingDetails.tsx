import { Alert, Collapse, Empty, Space, Tag, Typography } from 'antd';
import { REVIEW_RULE_LABELS, REVIEW_STATUS_LABELS } from '../constants/review';
import { useAppStyles } from '../styles/use-app-styles';
import { useReviewStyles } from '../styles/use-review-styles';
import type { IReviewFinding } from '../types/review';
import { redactSource } from '../utils/review/redact-source';

interface IReviewFindingDetailsProps {
  finding?: IReviewFinding;
}

export const ReviewFindingDetails = ({
  finding,
}: IReviewFindingDetailsProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const { cx, styles: reviewStyles } = useReviewStyles();
  if (!finding)
    return (
      <div className={styles.detailEmpty}>
        <Empty description="Select a finding" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );

  const source = redactSource(finding.script.source, finding.redactions);
  const lines = source.split(/\r\n|\r|\n/);
  const configuration = finding.script.kind === 'configuration';
  const start = Math.max(0, finding.line - 4);
  const severity = finding.rule === 'console-usage' ? 'Info' : 'Warning';

  return (
    <article aria-label="Review finding" className={styles.changeDetail}>
      <Space size={6} wrap>
        <Tag color={severity === 'Warning' ? 'gold' : 'blue'}>{severity}</Tag>
        <Tag>{REVIEW_STATUS_LABELS[finding.status]}</Tag>
        <Tag>{REVIEW_RULE_LABELS[finding.rule]}</Tag>
        {finding.redactions?.length ? <Tag>Credential values masked</Tag> : null}
      </Space>
      <Typography.Title level={3} style={{ fontSize: 17 }}>
        {finding.title}
      </Typography.Title>
      <span className={styles.detailPath} title={finding.script.path}>
        {finding.script.label}
      </span>
      <Typography.Paragraph style={{ marginTop: 16 }}>{finding.message}</Typography.Paragraph>
      {finding.status === 'unverified' && (
        <Alert
          title="Comparison incomplete: a version of this script could not be fully checked."
          showIcon
          type="warning"
        />
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        {finding.side} | Line {finding.line}, column {finding.column}
      </Typography.Paragraph>
      <pre aria-label="Script evidence" className={reviewStyles.evidence} tabIndex={0}>
        {lines.slice(start, finding.line + 3).map((line, index) => (
          <span
            className={cx(
              reviewStyles.evidenceLine,
              start + index + 1 === finding.line && reviewStyles.highlightLine,
            )}
            data-line={start + index + 1}
            key={start + index}
          >
            <span aria-hidden="true" className={styles.codeLineNumber}>
              {start + index + 1}
            </span>
            <code>{line || ' '}</code>
          </span>
        ))}
      </pre>
      <Collapse
        key={finding.id}
        ghost
        size="small"
        items={[
          {
            key: 'source',
            label: configuration ? 'Full value' : 'Full script',
            children: (
              <pre
                aria-label={configuration ? 'Full configuration value' : 'Full script source'}
                className={reviewStyles.fullScript}
                tabIndex={0}
              >
                {source}
              </pre>
            ),
          },
        ]}
      />
    </article>
  );
};
