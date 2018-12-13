import { Observable } from 'rxjs';
import { CommandExecutionInfo } from './command-execution-info';

export interface Command<TParam, TResult> extends CommandExecutionInfo<TResult> {
  execute(parameter?: TParam): Observable<TResult>;

  executeAsync(parameter?: TParam): Promise<TResult>;
}
