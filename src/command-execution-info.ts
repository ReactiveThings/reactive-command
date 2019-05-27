import { Observable } from 'rxjs'

export interface CommandExecutionInfo<TResult, TError = any> {
  results: Observable<TResult>

  canExecute: Observable<boolean>

  isExecuting: Observable<boolean>

  errors: Observable<TError>
}
