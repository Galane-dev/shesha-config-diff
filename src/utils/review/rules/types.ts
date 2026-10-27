import type { AnyNode, Program } from 'acorn';
import type { IScriptFinding, IScriptSource, ReviewRule } from '../../../types/review';
import type { IScopeInfo } from '../scope';

export interface IRuleContext {
  program: Program;
  script: IScriptSource;
  scopes: IScopeInfo;
  report: (
    rule: ReviewRule,
    node: AnyNode,
    details: Pick<IScriptFinding, 'title' | 'message' | 'redactions'>,
  ) => void;
}

export type ScriptReviewRule = (context: IRuleContext) => void;
