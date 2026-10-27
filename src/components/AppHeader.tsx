import { DiffOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Tooltip, Typography } from 'antd';
import { APP_NAME } from '../constants/app';
import { useAppStyles } from '../styles/use-app-styles';

interface IAppHeaderProps {
  onOpenSettings: () => void;
}

export const AppHeader = ({ onOpenSettings }: IAppHeaderProps): React.JSX.Element => {
  const { styles } = useAppStyles();

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerTitle}>
          <span className={styles.brandIcon} aria-hidden="true">
            <DiffOutlined />
          </span>
          <span className={styles.headerTitleText}>
            <Typography.Text strong>{APP_NAME}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Form configuration review
            </Typography.Text>
          </span>
        </div>

        <Space size={8}>
          <Tag icon={<SafetyCertificateOutlined />} color="green">
            Local session
          </Tag>
          <Tooltip title="AI provider settings">
            <Button
              aria-label="Open AI provider settings"
              icon={<SettingOutlined />}
              onClick={onOpenSettings}
              type="text"
            />
          </Tooltip>
        </Space>
      </div>
    </header>
  );
};
