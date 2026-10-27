import { Tag } from 'antd';
import type { DiffChangeType } from '../types/diff';

interface IChangeTypeTagProps {
  changeType: DiffChangeType;
}

const TAG_COLORS: Record<DiffChangeType, string> = {
  added: 'green',
  modified: 'gold',
  moved: 'blue',
  removed: 'red',
};

export const ChangeTypeTag = ({ changeType }: IChangeTypeTagProps): React.JSX.Element => (
  <Tag color={TAG_COLORS[changeType]} style={{ marginInlineEnd: 0 }}>
    {changeType}
  </Tag>
);
