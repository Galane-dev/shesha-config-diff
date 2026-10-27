import {
  CheckCircleFilled,
  CloseOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Alert, Button, Tag, Tooltip, Typography, Upload } from 'antd';
import type { IUploadedForm } from '../types/shesha-form';
import { formatFileSize } from '../utils/files/format-file-size';
import { useAppStyles } from '../styles/use-app-styles';

interface IFileDropZoneProps {
  error?: string;
  label: 'After' | 'Before';
  onClear: () => void;
  onSelect: (file: File) => void;
  value?: IUploadedForm;
}

export const FileDropZone = ({
  error,
  label,
  onClear,
  onSelect,
  value,
}: IFileDropZoneProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();

  return (
    <section className={cx(styles.fileSlot, error && styles.fileSlotError)} aria-label={`${label} form`}>
      <div className={styles.fileSlotLabel}>
        <Typography.Text strong>{label}</Typography.Text>
        <Tag color={label === 'Before' ? 'default' : 'gold'}>{label === 'Before' ? 'Baseline' : 'Candidate'}</Tag>
      </div>

      <div className={styles.uploadDragger}>
        <Upload.Dragger
          accept=".json,application/json"
          beforeUpload={(file) => {
            onSelect(file);
            return Upload.LIST_IGNORE;
          }}
          maxCount={1}
          multiple={false}
          openFileDialogOnClick
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            {value ? <FileTextOutlined /> : <InboxOutlined />}
          </p>
          <Typography.Text strong>{value ? 'Replace form export' : 'Drop form export'}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            JSON, up to 15 MB
          </Typography.Text>
        </Upload.Dragger>
      </div>

      {value && (
        <div className={styles.fileMetaRow}>
          <div className={styles.fileMeta}>
            <span className={styles.fileName} title={value.metadata.fileName}>
              <CheckCircleFilled style={{ color: '#389e0d', marginRight: 6 }} />
              {value.metadata.fileName}
            </span>
            <span className={styles.fileSecondary}>
              {value.metadata.modelType ?? 'No model type'} · {formatFileSize(value.metadata.fileSize)}
            </span>
          </div>
          <div className={styles.fileActions}>
            <Tooltip title={`Remove ${label.toLowerCase()} file`}>
              <Button
                aria-label={`Remove ${label.toLowerCase()} file`}
                danger
                icon={<CloseOutlined />}
                onClick={onClear}
                size="small"
                type="text"
              />
            </Tooltip>
          </div>
        </div>
      )}

      {value && value.warnings.length > 0 && (
        <ul className={styles.warningList}>
          {value.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      {error && <Alert banner message={error} showIcon type="error" />}
    </section>
  );
};
