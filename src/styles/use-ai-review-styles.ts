import { createStyles } from 'antd-style';

export const useAiReviewStyles = createStyles(({ css, token }) => ({
  panel: css`
    min-height: 420px;
    padding: 20px 24px 28px;
    overflow-wrap: anywhere;

    @media (max-width: 720px) {
      padding: 16px;
    }
  `,
  header: css`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  `,
  toolbar: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  metadata: css`
    display: block;
    margin-top: 4px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  request: css`
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  source: css`
    margin-top: 8px;

    summary {
      cursor: pointer;
      color: ${token.colorPrimaryText};
      overflow-wrap: anywhere;
    }

    summary:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 3px;
    }

    pre {
      max-height: 320px;
      overflow: auto;
      margin-bottom: 0;
      padding: 12px;
      border: 1px solid ${token.colorBorderSecondary};
      border-radius: 4px;
      background: #f6f8fa;
      color: ${token.colorText};
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
  summary: css`
    max-width: 880px;
    margin: 20px 0;
    line-height: 1.6;
  `,
  sections: css`
    border-top: 1px solid ${token.colorBorderSecondary};

    .ant-collapse-header {
      align-items: center !important;
      padding-inline: 0 !important;
    }

    .ant-collapse-body {
      padding-inline: 0 !important;
    }
  `,
  finding: css`
    padding: 14px 0;
    border-top: 1px solid ${token.colorBorderSecondary};
    line-height: 1.6;

    &:first-child {
      border-top: 0;
      padding-top: 0;
    }

    p {
      max-width: 880px;
      margin: 6px 0;
    }
  `,
}));
