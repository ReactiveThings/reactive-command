import { ExecutionDemarcation } from './execution-demarcation';

export class ExecutionInfo<TResult> {

  constructor(private readonly demarcation: ExecutionDemarcation, private readonly result?: TResult) {
  }

  get Demarcation(): ExecutionDemarcation {
      return this.demarcation;
  }

  get Result(): TResult | undefined {
      return this.result;
  }

  public static CreateBegin<TResult>(): ExecutionInfo<TResult> {
      return new ExecutionInfo(ExecutionDemarcation.Begin);
  }

  public static CreateResult<TResult>(result: TResult): ExecutionInfo<TResult> {
      return new ExecutionInfo(ExecutionDemarcation.Result, result);
  }

  public static CreateEnd<TResult>(): ExecutionInfo<TResult> {
      return new ExecutionInfo(ExecutionDemarcation.End);
  }
}
