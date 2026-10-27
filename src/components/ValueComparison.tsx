import { Typography } from 'antd';
import type { DiffViewMode } from '../types/diff';
import type { JsonValue } from '../types/json';
import { isJsonObject, stringifyJsonValue } from '../utils/diff/json-utils';
import { InlineDiff } from './InlineDiff';
import { SideBySideDiff } from './SideBySideDiff';

interface IValueComparisonProps {
  after?: JsonValue;
  before?: JsonValue;
  isScript?: boolean;
  viewMode?: DiffViewMode;
}

const getDisplayText = (value: JsonValue | undefined, isScript: boolean): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (isScript && isJsonObject(value) && typeof value._code === 'string') {
    return value._code;
  }

  return stringifyJsonValue(value);
};

export const ValueComparison = ({
  after,
  before,
  isScript = false,
  viewMode = 'side-by-side',
}: IValueComparisonProps): React.JSX.Element => {
  if (before === undefined && after === undefined) {
    return <Typography.Text type="secondary">No value</Typography.Text>;
  }

  const Diff = viewMode === 'inline' ? InlineDiff : SideBySideDiff;

  return (
    <Diff
      after={getDisplayText(after, isScript)}
      before={getDisplayText(before, isScript)}
      isScript={isScript}
    />
  );
};
