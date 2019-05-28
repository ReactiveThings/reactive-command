import { Observable } from 'rxjs'

export interface Command<TParam, TResult> {
  execute(parameter?: TParam): Observable<TResult>
  executeAsync(parameter?: TParam): Promise<TResult>
}
