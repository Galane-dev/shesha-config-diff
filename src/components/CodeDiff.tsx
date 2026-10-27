import type { JsonValue } from '../types/json';
import { useAppStyles } from '../styles/use-app-styles';
import { createLineDiff } from '../utils/diff/line-diff';
import { isJsonObject, stringifyJsonValue } from '../utils/diff/json-utils';

interface ICodeDiffProps {
  after?: JsonValue;
  before?: JsonValue;
}

const getCode = (value: JsonValue | undefined): string => {
  if (isJsonObject(value) && typeof value._code === 'string') {
    return value._code;
  }

  return stringifyJsonValue(value);
};

export const CodeDiff = ({ after, before }: ICodeDiffProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();
  const lines = createLineDiff(getCode(before), getCode(after));

  return (
    <div className={styles.codeDiff} role="table" aria-label="Script line diff">
      {lines.map((line, index) => (
        <div
          className={cx(
            styles.codeLine,
            line.type === 'added' && styles.codeLineAdded,
            line.type === 'removed' && styles.codeLineRemoved,
          )}
          key={`${line.type}-${index}-${line.content}`}
          role="row"
        >
          <span className={styles.codeLineNumber}>{line.lineNumberBefore ?? ''}</span>
          <span className={styles.codeLineNumber}>{line.lineNumberAfter ?? ''}</span>
          <span className={styles.codeLineMarker}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
          </span>
          <code className={styles.codeLineContent}>{line.content || ' '}</code>
        </div>
      ))}
    </div>
  );
};
