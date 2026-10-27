import { useAppStyles } from '../styles/use-app-styles';
import { createLineDiff } from '../utils/diff/line-diff';

interface IInlineDiffProps {
  after?: string;
  before?: string;
  isScript: boolean;
}

export const InlineDiff = ({ after, before, isScript }: IInlineDiffProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();
  const lines = createLineDiff(before, after);

  return (
    <div className={styles.codeDiff} role="region" aria-label="Diff content" tabIndex={0}>
      <table className={styles.codeTable} aria-label={isScript ? 'Script line diff' : 'Value line diff'}>
        <thead>
          <tr>
            <th className={cx(styles.codeHeader, styles.inlineLineNumber)} scope="col">Before</th>
            <th className={cx(styles.codeHeader, styles.inlineLineNumber)} scope="col">After</th>
            <th className={cx(styles.codeHeader, styles.inlineMarker)} scope="col" aria-label="Change" />
            <th className={styles.codeHeader} scope="col">Content</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr
              className={cx(
                styles.inlineRow,
                line.type === 'added' && styles.codeLineAdded,
                line.type === 'removed' && styles.codeLineRemoved,
              )}
              key={index}
            >
              <td className={styles.codeLineNumber}>{line.lineNumberBefore ?? ''}</td>
              <td className={styles.codeLineNumber}>{line.lineNumberAfter ?? ''}</td>
              <td className={styles.codeLineMarker}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </td>
              <td className={styles.codeLineContent}><code>{line.content || ' '}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
