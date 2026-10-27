import { createStyles } from 'antd-style';

export const useAppStyles = createStyles(({ css, token }) => ({
  aiContent: css`
    max-width: 880px;
    color: ${token.colorText};
    line-height: 1.65;

    h1, h2, h3 {
      margin-top: 22px;
      margin-bottom: 8px;
      letter-spacing: 0;
    }

    h1 { font-size: 20px; }
    h2 { font-size: 17px; }
    h3 { font-size: 15px; }

    pre {
      overflow: auto;
      padding: 12px;
      border: 1px solid ${token.colorBorderSecondary};
      border-radius: 4px;
      background: #f6f8fa;
    }
  `,
  aiPanel: css`
    min-height: 420px;
    padding: 20px 24px 32px;
  `,
  app: css`
    min-height: 100vh;
    background: ${token.colorBgLayout};
  `,
  appContent: css`
    width: min(1600px, 100%);
    margin: 0 auto;
    padding: 20px 24px 48px;

    @media (max-width: 720px) {
      padding: 12px 12px 32px;
    }
  `,
  brandIcon: css`
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 6px;
    background: #fff7e6;
    color: ${token.colorPrimary};
    font-size: 19px;
  `,
  changeDetail: css`
    min-width: 0;
    padding: 20px 24px 28px;

    @media (max-width: 720px) {
      padding: 16px;
    }
  `,
  changeHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  changeList: css`
    height: 630px;
    overflow: auto;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: #fbfcfd;

    @media (max-width: 900px) {
      height: 280px;
      border-right: 0;
      border-bottom: 1px solid ${token.colorBorderSecondary};
    }
  `,
  changeListItem: css`
    width: 100%;
    min-height: 68px;
    padding: 10px 14px;
    border: 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease, box-shadow 120ms ease;

    &:hover {
      background: #f4f6f8;
    }

    &:focus-visible {
      position: relative;
      z-index: 1;
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  changeListItemActive: css`
    background: #fff8e8;
    box-shadow: inset 3px 0 0 ${token.colorPrimary};

    &:hover {
      background: #fff8e8;
    }
  `,
  changeListMeta: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 5px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  changeListTitle: css`
    display: block;
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  codeDiff: css`
    overflow: auto;
    max-height: 520px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 4px;
    background: #ffffff;
    font-size: 12px;
    line-height: 1.55;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  codeTable: css`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  `,
  codeHeader: css`
    position: sticky;
    z-index: 1;
    top: 0;
    padding: 7px 11px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: #fbfcfd;
    color: ${token.colorTextSecondary};
    text-align: left;
    font-weight: 600;
  `,
  codeCell: css`
    padding: 0;
    border-right: 1px solid ${token.colorBorderSecondary};
    vertical-align: top;

    &:last-child {
      border-right: 0;
    }
  `,
  codeCellEmpty: css`
    background: #f6f8fa;
  `,
  codeLine: css`
    display: grid;
    grid-template-columns: 42px 22px minmax(0, 1fr);
    min-height: 22px;

    @media (max-width: 720px) {
      grid-template-columns: 28px 16px minmax(0, 1fr);
    }
  `,
  codeLineAdded: css`
    background: #eaf7ee;
  `,
  codeLineRemoved: css`
    background: #fff0f0;
  `,
  codeLineContent: css`
    min-width: 0;
    padding: 1px 10px 1px 4px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  `,
  codeLineMarker: css`
    padding: 1px 5px;
    color: ${token.colorTextSecondary};
    text-align: center;
    user-select: none;
  `,
  codeLineNumber: css`
    padding: 1px 7px;
    border-right: 1px solid ${token.colorBorderSecondary};
    color: #7d8590;
    text-align: right;
    user-select: none;
  `,
  detailEmpty: css`
    display: grid;
    min-height: 420px;
    place-items: center;
  `,
  detailPath: css`
    display: block;
    margin-top: 5px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    overflow-wrap: anywhere;
  `,
  fileActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  fileMeta: css`
    display: grid;
    min-width: 0;
    gap: 2px;
  `,
  fileMetaRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 8px 10px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: #fbfcfd;
  `,
  fileName: css`
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  fileSecondary: css`
    overflow: hidden;
    color: ${token.colorTextSecondary};
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  fileSlot: css`
    overflow: hidden;
    border: 1px solid ${token.colorBorder};
    border-radius: 6px;
    background: ${token.colorBgContainer};
  `,
  fileSlotError: css`
    border-color: ${token.colorErrorBorder};
  `,
  fileSlotLabel: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 42px;
    padding: 8px 12px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: min(1600px, 100%);
    margin: 0 auto;
    padding: 0 24px 24px;
    color: ${token.colorTextSecondary};
    font-size: 12px;

    @media (max-width: 720px) {
      align-items: flex-start;
      flex-direction: column;
      padding: 0 12px 20px;
    }
  `,
  header: css`
    position: sticky;
    z-index: 20;
    top: 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  `,
  headerInner: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: min(1600px, 100%);
    min-height: 58px;
    margin: 0 auto;
    padding: 0 24px;

    @media (max-width: 720px) {
      padding: 0 12px;
    }
  `,
  headerTitle: css`
    display: flex;
    align-items: center;
    gap: 10px;
  `,
  headerTitleText: css`
    display: grid;
    gap: 1px;
  `,
  listToolbar: css`
    display: grid;
    gap: 10px;
    padding: 12px;
    border-right: 1px solid ${token.colorBorderSecondary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: #ffffff;

    .ant-segmented-item-label {
      padding-inline: 4px;
      font-size: 12px;
    }

    @media (max-width: 900px) {
      border-right: 0;
    }
  `,
  rawGrid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-height: 600px;

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  rawPane: css`
    min-width: 0;
    border-right: 1px solid ${token.colorBorderSecondary};

    &:last-child {
      border-right: 0;
    }

    @media (max-width: 900px) {
      border-right: 0;
      border-bottom: 1px solid ${token.colorBorderSecondary};
    }
  `,
  rawPaneHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 42px;
    padding: 8px 12px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: #fbfcfd;
  `,
  rawPre: css`
    height: 560px;
    margin: 0;
    overflow: auto;
    padding: 14px;
    background: #ffffff;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre;
  `,
  settingsFooter: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 24px;
  `,
  summaryBar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border: 1px solid ${token.colorBorder};
    border-bottom: 0;
    border-radius: 6px 6px 0 0;
    background: #ffffff;

    @media (max-width: 900px) {
      align-items: flex-start;
      flex-direction: column;
    }
  `,
  summaryCounts: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  `,
  summaryTitle: css`
    min-width: 0;
  `,
  uploadDragger: css`
    .ant-upload.ant-upload-drag {
      min-height: 126px;
      border: 0;
      border-radius: 0;
      background: #ffffff;
    }

    .ant-upload-drag-container {
      padding: 18px 12px;
    }

    .ant-upload-drag-icon {
      margin-bottom: 6px !important;
    }
  `,
  uploadGrid: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
    align-items: center;
    gap: 12px;

    @media (max-width: 760px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  uploadSection: css`
    display: grid;
    gap: 10px;
    margin-bottom: 18px;
  `,
  warningList: css`
    margin: 0;
    padding: 8px 12px 10px 28px;
    border-top: 1px solid ${token.colorWarningBorder};
    background: ${token.colorWarningBg};
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  workspace: css`
    overflow: hidden;
    border: 1px solid ${token.colorBorder};
    border-radius: 0 0 6px 6px;
    background: #ffffff;
  `,
  workspaceGrid: css`
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    min-height: 630px;

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
}));
