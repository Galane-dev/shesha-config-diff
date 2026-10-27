import type { IComponentChange, IFormDiff, IValueChange } from '../../types/diff';
import { stringifyJsonValue } from '../diff/json-utils';

const escapeTableCell = (value: string): string => value.replaceAll('|', '\\|').replaceAll('\n', '<br>');

const formatValue = (value: IValueChange['before']): string => {
  const formatted = stringifyJsonValue(value);
  const limited = formatted.length > 600 ? `${formatted.slice(0, 597)}...` : formatted;
  return escapeTableCell(limited || '(empty)');
};

const createPropertyRows = (changes: IValueChange[]): string[] => changes.map((change) =>
  `| ${escapeTableCell(change.path)} | ${change.changeType} | ${formatValue(change.before)} | ${formatValue(change.after)} |`,
);

const createComponentSection = (change: IComponentChange): string[] => {
  const heading = `### ${change.label} (${change.componentType})`;
  const details = [
    `- Change: ${change.changeType}`,
    `- Path: ${change.path}`,
    change.componentId ? `- Component ID: \`${change.componentId}\`` : '- Component ID: missing',
  ];

  if (change.previousPath) {
    details.push(`- Previous path: ${change.previousPath}`);
  }

  if (change.propertyChanges.length === 0) {
    return [heading, '', ...details, ''];
  }

  return [
    heading,
    '',
    ...details,
    '',
    '| Property | Change | Before | After |',
    '| --- | --- | --- | --- |',
    ...createPropertyRows(change.propertyChanges),
    '',
  ];
};

export const generateMarkdownReport = (diff: IFormDiff): string => {
  const lines = [
    '# Shesha configuration diff',
    '',
    `- Before: ${diff.beforeMetadata.fileName}`,
    `- After: ${diff.afterMetadata.fileName}`,
    `- Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Changed components: ${diff.counts.components}`,
    `- Form setting changes: ${diff.counts.formSettings}`,
    `- Script or expression changes: ${diff.counts.scripts}`,
    `- Added entries: ${diff.counts.added}`,
    `- Removed entries: ${diff.counts.removed}`,
    `- Modified entries: ${diff.counts.modified}`,
    `- Moved components: ${diff.counts.moved}`,
    '',
    '## Components',
    '',
  ];

  if (diff.componentChanges.length === 0) {
    lines.push('No component changes.', '');
  } else {
    diff.componentChanges.forEach((change) => lines.push(...createComponentSection(change)));
  }

  lines.push('## Form settings', '');

  if (diff.formSettingChanges.length === 0) {
    lines.push('No form setting changes.', '');
  } else {
    lines.push(
      '| Property | Change | Before | After |',
      '| --- | --- | --- | --- |',
      ...createPropertyRows(diff.formSettingChanges),
      '',
    );
  }

  lines.push(
    '> This report is generated deterministically in the browser. AI explanations, when used, are not part of the source diff.',
    '',
  );

  return lines.join('\n');
};

export const downloadMarkdownReport = (diff: IFormDiff): void => {
  const content = generateMarkdownReport(diff);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const baseName = diff.afterMetadata.configName ?? 'shesha-form';

  anchor.href = objectUrl;
  anchor.download = `${baseName}-diff.md`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};
