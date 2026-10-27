import { DeleteOutlined, SwapOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { IUploadedForm } from '../types/shesha-form';
import { useAppStyles } from '../styles/use-app-styles';
import { FileDropZone } from './FileDropZone';

interface IUploadSectionProps {
  afterError?: string;
  afterForm?: IUploadedForm;
  beforeError?: string;
  beforeForm?: IUploadedForm;
  onClear: () => void;
  onClearAfter: () => void;
  onClearBefore: () => void;
  onSelectAfter: (file: File) => void;
  onSelectBefore: (file: File) => void;
  onSwap: () => void;
}

export const UploadSection = ({
  afterError,
  afterForm,
  beforeError,
  beforeForm,
  onClear,
  onClearAfter,
  onClearBefore,
  onSelectAfter,
  onSelectBefore,
  onSwap,
}: IUploadSectionProps): React.JSX.Element => {
  const { styles } = useAppStyles();
  const hasAnyFile = Boolean(beforeForm || afterForm);

  return (
    <section className={styles.uploadSection}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={2} style={{ fontSize: 16, margin: 0 }}>
          Compare exports
        </Typography.Title>
        {hasAnyFile && (
          <Button icon={<DeleteOutlined />} onClick={onClear} size="small" type="text">
            Clear
          </Button>
        )}
      </Space>

      <div className={styles.uploadGrid}>
        <FileDropZone
          error={beforeError}
          label="Before"
          onClear={onClearBefore}
          onSelect={onSelectBefore}
          value={beforeForm}
        />

        <Tooltip title="Swap before and after">
          <Button
            aria-label="Swap before and after"
            disabled={!beforeForm && !afterForm}
            icon={<SwapOutlined />}
            onClick={onSwap}
            shape="circle"
          />
        </Tooltip>

        <FileDropZone
          error={afterError}
          label="After"
          onClear={onClearAfter}
          onSelect={onSelectAfter}
          value={afterForm}
        />
      </div>
    </section>
  );
};
