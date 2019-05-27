import { ExecutionState } from './execution-state'

export class ExecutionInfo<TResult> {
  constructor(public readonly state: ExecutionState, public readonly result?: TResult) {}

  public static begin<TResult>(): ExecutionInfo<TResult> {
    return new ExecutionInfo(ExecutionState.Begin)
  }

  public static result<TResult>(result: TResult): ExecutionInfo<TResult> {
    return new ExecutionInfo(ExecutionState.Result, result)
  }

  public static end<TResult>(): ExecutionInfo<TResult> {
    return new ExecutionInfo(ExecutionState.End)
  }
}
