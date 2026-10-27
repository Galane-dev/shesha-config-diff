import { FileSearchOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import { useAppStyles } from '../styles/use-app-styles';

export const ComparisonEmptyState = (): React.JSX.Element => {
  const { styles } = useAppStyles();

  return (
    <div className={styles.workspace}>
      <div className={styles.detailEmpty}>
        <Empty
          description="Select two Shesha form exports"
          image={<FileSearchOutlined style={{ color: '#9a6700', fontSize: 54 }} />}
        />
      </div>
    </div>
  );
};
