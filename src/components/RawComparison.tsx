import { Tag, Typography } from 'antd';
import type { IUploadedForm } from '../types/shesha-form';
import { useAppStyles } from '../styles/use-app-styles';
import { canonicalizeJson } from '../utils/diff/json-utils';

interface IRawComparisonProps {
  afterForm: IUploadedForm;
  beforeForm: IUploadedForm;
}

const RawPane = ({ form, label }: { form: IUploadedForm; label: string }): React.JSX.Element => {
  const { styles } = useAppStyles();

  return (
    <section className={styles.rawPane}>
      <div className={styles.rawPaneHeader}>
        <Typography.Text strong>{label}</Typography.Text>
        <Tag>{form.metadata.fileName}</Tag>
      </div>
      <pre className={styles.rawPre}>{JSON.stringify(canonicalizeJson(form.form), null, 2)}</pre>
    </section>
  );
};

export const RawComparison = ({ afterForm, beforeForm }: IRawComparisonProps): React.JSX.Element => {
  const { styles } = useAppStyles();

  return (
    <div className={styles.rawGrid}>
      <RawPane form={beforeForm} label="Before" />
      <RawPane form={afterForm} label="After" />
    </div>
  );
};

export default RawComparison;
