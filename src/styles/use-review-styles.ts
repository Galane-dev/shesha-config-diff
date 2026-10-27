import { createStyles } from 'antd-style';

export const useReviewStyles = createStyles(({ css, token }) => ({
  controls: css`
    display: grid;
    grid-template-columns: minmax(320px, 1.2fr) minmax(150px, 0.6fr) minmax(180px, 1fr);
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    .ant-segmented {
      justify-self: start;
      max-width: 100%;
    }

    .ant-segmented-item-label {
      padding-inline: 4px;
      font-size: 12px;
    }

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  disclaimer: css`
    display: block;
    margin-top: 3px;
    font-size: 12px;
  `,
  evidence: css`
    overflow: auto;
    max-height: 360px;
    margin: 12px 0;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.6;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  evidenceLine: css`
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);

    code {
      min-width: 0;
      padding-inline: 8px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  `,
  findingsList: css`
    @media (max-width: 900px) {
      height: auto;
      max-height: 280px;
    }
  `,
  fullScript: css`
    max-height: 440px;
    overflow: auto;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  grid: css`
    @media (max-width: 900px) {
      min-height: 0;
    }
  `,
  header: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  highlightLine: css`
    background: ${token.colorWarningBg};
  `,
  location: css`
    display: block;
    overflow: hidden;
    margin-top: 4px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));
