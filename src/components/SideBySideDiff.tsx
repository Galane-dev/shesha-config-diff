import { useAppStyles } from '../styles/use-app-styles';
import { createSideBySideDiff } from '../utils/diff/line-diff';

interface ISideBySideDiffProps {
  after?: string;
  before?: string;
  isScript: boolean;
}

export const SideBySideDiff = ({ after, before, isScript }: ISideBySideDiffProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();
  const rows = createSideBySideDiff(before, after);

  return (
    <div className={styles.codeDiff} role="region" aria-label="Diff content" tabIndex={0}>
      <table className={styles.codeTable} aria-label={isScript ? 'Script line diff' : 'Value line diff'}>
        <thead>
          <tr>
            <th className={styles.codeHeader} scope="col">Before</th>
            <th className={styles.codeHeader} scope="col">After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {(['before', 'after'] as const).map((side) => {
                const line = row[side];

                return (
                  <td
                    className={cx(
                      styles.codeCell,
                      !line && styles.codeCellEmpty,
                      line?.type === 'added' && styles.codeLineAdded,
                      line?.type === 'removed' && styles.codeLineRemoved,
                    )}
                    key={side}
                  >
                    {line && (
                      <div className={styles.codeLine}>
                        <span className={styles.codeLineNumber} aria-hidden="true">
                          {side === 'before' ? line.lineNumberBefore : line.lineNumberAfter}
                        </span>
                        <span className={styles.codeLineMarker} aria-hidden="true">
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        <code className={styles.codeLineContent}>{line.content || ' '}</code>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
