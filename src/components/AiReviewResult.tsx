import { Collapse, Space, Tag, Typography } from 'antd';
import type { IAiReview, IAiReviewTarget } from '../types/ai';
import { useAiReviewStyles } from '../styles/use-ai-review-styles';

interface IAiReviewResultProps {
  review: IAiReview;
  targets: IAiReviewTarget[];
}

const ReviewSource = ({ target }: { target?: IAiReviewTarget }): React.JSX.Element | null => {
  const { styles } = useAiReviewStyles();
  if (!target) {
    return null;
  }

  return (
    <details className={styles.source}>
      <summary>After: {target.label}</summary>
      <Typography.Text className={styles.metadata}>{target.path}</Typography.Text>
      {target.truncated && (
        <Typography.Text className={styles.metadata}>Partial source context</Typography.Text>
      )}
      <pre aria-label={`After source: ${target.label}`} tabIndex={0}>
        {target.source}
      </pre>
    </details>
  );
};

export const AiReviewResult = ({ review, targets }: IAiReviewResultProps): React.JSX.Element => {
  const { styles } = useAiReviewStyles();
  const targetById = new Map(targets.map((target) => [target.id, target]));

  return (
    <article aria-label="AI review result">
      <section aria-label="Change summary" className={styles.summary}>
        <Typography.Title level={4} style={{ fontSize: 15, marginBottom: 8 }}>
          Change summary
        </Typography.Title>
        <Typography.Paragraph>{review.summary}</Typography.Paragraph>
      </section>
      <Collapse
        className={styles.sections}
        ghost
        items={[
          {
            key: 'improvements',
            label: (
              <Space>
                <Typography.Text strong>Suggested improvements</Typography.Text>
                <Tag>{review.improvements.length}</Tag>
              </Space>
            ),
            children:
              review.improvements.length === 0 ? (
                <Typography.Text type="secondary">
                  No specific improvements identified in the supplied context.
                </Typography.Text>
              ) : (
                review.improvements.map((item, index) => (
                  <section className={styles.finding} key={index} aria-label={item.title}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <p>{item.reason}</p>
                    <p>
                      <strong>Suggestion:</strong> {item.suggestion}
                    </p>
                    <ReviewSource target={targetById.get(item.targetId)} />
                  </section>
                ))
              ),
          },
          {
            key: 'edge-cases',
            label: (
              <Space>
                <Typography.Text strong>Edge cases to test</Typography.Text>
                <Tag>{review.edgeCases.length}</Tag>
              </Space>
            ),
            children:
              review.edgeCases.length === 0 ? (
                <Typography.Text type="secondary">
                  No specific edge cases identified in the supplied context.
                </Typography.Text>
              ) : (
                review.edgeCases.map((item, index) => (
                  <section className={styles.finding} key={index} aria-label={item.title}>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <p>{item.scenario}</p>
                    <p>
                      <strong>Expected:</strong> {item.expected}
                    </p>
                    <ReviewSource target={targetById.get(item.targetId)} />
                  </section>
                ))
              ),
          },
        ]}
      />
      <Typography.Text className={styles.metadata}>
        AI suggestions need verification. Deterministic changes remain authoritative.
      </Typography.Text>
    </article>
  );
};
