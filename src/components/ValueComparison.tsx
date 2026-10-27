import { Typography } from 'antd';
import type { JsonValue } from '../types/json';
import { useAppStyles } from '../styles/use-app-styles';
import { stringifyJsonValue } from '../utils/diff/json-utils';
import { CodeDiff } from './CodeDiff';

interface IValueComparisonProps {
  after?: JsonValue;
  before?: JsonValue;
  isScript?: boolean;
}

export const ValueComparison = ({
  after,
  before,
  isScript = false,
}: IValueComparisonProps): React.JSX.Element => {
  const { styles } = useAppStyles();

  if (isScript) {
    return <CodeDiff after={after} before={before} />;
  }

  return (
    <div className={styles.sideBySide}>
      <section className={styles.valuePane}>
        <div className={styles.valueTitle}>Before</div>
        <pre className={styles.valuePre}>{stringifyJsonValue(before)}</pre>
      </section>
      <section className={styles.valuePane}>
        <div className={styles.valueTitle}>After</div>
        <pre className={styles.valuePre}>{stringifyJsonValue(after)}</pre>
      </section>
      {before === undefined && after === undefined && (
        <Typography.Text type="secondary">No value</Typography.Text>
      )}
    </div>
  );
};
