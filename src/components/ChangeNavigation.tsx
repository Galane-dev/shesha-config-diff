import { CodeOutlined, SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Segmented, Typography } from 'antd';
import type { DiffFilter } from '../types/diff';
import type { IDiffSelection } from '../types/ui';
import { useAppStyles } from '../styles/use-app-styles';
import { ChangeTypeTag } from './ChangeTypeTag';

interface IChangeNavigationProps {
  filter: DiffFilter;
  onFilterChange: (filter: DiffFilter) => void;
  onSearchChange: (searchText: string) => void;
  onSelect: (id: string) => void;
  searchText: string;
  selectedId?: string;
  selections: IDiffSelection[];
}

const FILTER_OPTIONS: { label: string; value: DiffFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Components', value: 'components' },
  { label: 'Settings', value: 'form-settings' },
  { label: 'Scripts', value: 'scripts' },
];

export const ChangeNavigation = ({
  filter,
  onFilterChange,
  onSearchChange,
  onSelect,
  searchText,
  selectedId,
  selections,
}: IChangeNavigationProps): React.JSX.Element => {
  const { cx, styles } = useAppStyles();

  return (
    <aside>
      <div className={styles.listToolbar}>
        <Segmented<DiffFilter>
          block
          onChange={onFilterChange}
          options={FILTER_OPTIONS}
          size="small"
          value={filter}
        />
        <Input
          allowClear
          aria-label="Search changes"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search changes"
          prefix={<SearchOutlined />}
          size="small"
          value={searchText}
        />
      </div>

      <div className={styles.changeList}>
        {selections.length === 0 ? (
          <Empty description="No matching changes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : selections.map((selection) => (
          <button
            className={cx(
              styles.changeListItem,
              selection.id === selectedId && styles.changeListItemActive,
            )}
            key={selection.id}
            onClick={() => onSelect(selection.id)}
            type="button"
          >
            <span className={styles.changeListTitle} title={selection.value?.path ?? selection.label}>
              {selection.isScript && <CodeOutlined style={{ marginRight: 6 }} />}
              {selection.label}
            </span>
            <span className={styles.changeListMeta}>
              <Typography.Text ellipsis type="secondary" style={{ fontSize: 12 }}>
                {selection.description}
              </Typography.Text>
              <ChangeTypeTag changeType={selection.changeType} />
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};
