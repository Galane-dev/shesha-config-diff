import { Typography } from 'antd';
import type { JsonValue } from '../types/json';
import { isJsonObject, stringifyJsonValue } from '../utils/diff/json-utils';
import { SideBySideDiff } from './SideBySideDiff';

interface IValueComparisonProps {
  after?: JsonValue;
  before?: JsonValue;
  isScript?: boolean;
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
}: IValueComparisonProps): React.JSX.Element => {
  if (before === undefined && after === undefined) {
    return <Typography.Text type="secondary">No value</Typography.Text>;
  }

  return (
    <SideBySideDiff
      after={getDisplayText(after, isScript)}
      before={getDisplayText(before, isScript)}
      isScript={isScript}
    />
  );
};
