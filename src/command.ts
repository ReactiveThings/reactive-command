import { Observable } from 'rxjs'
import { CommandExecutionInfo } from './command-execution-info'

export interface Command<TParam, TResult, TError = any>
  extends CommandExecutionInfo<TResult, TError> {
  execute(parameter?: TParam): Observable<TResult>

  executeAsync(parameter?: TParam): Promise<TResult>
}
