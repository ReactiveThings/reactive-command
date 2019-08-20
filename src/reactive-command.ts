import {
  Subject,
  throwError,
  of,
  from,
  combineLatest,
  defer,
  Observable,
  BehaviorSubject,
} from 'rxjs'
import {
  catchError,
  startWith,
  distinctUntilChanged,
  publishReplay,
  refCount,
  map,
  tap,
  finalize,
  publishLast,
} from 'rxjs/operators'
import { Command } from './command'
import { CommandExecutionInfo } from './command-execution-info'

export class ReactiveCommand<TParam, TResult, TError = any>
  implements Command<TParam, TResult>, CommandExecutionInfo<TResult, TError> {
  public readonly results: Observable<TResult>
  get canExecute(): Observable<boolean> {
    return this.canExecute$
  }

  get isExecuting(): Observable<boolean> {
    return this.isExecuting$
  }

  get errors(): Observable<TError> {
    return this.errors$
  }
  private readonly _execute: (param: TParam | undefined) => Observable<TResult>

  private readonly isExecuting$: Observable<boolean>
  private readonly canExecute$: Observable<boolean>
  private readonly errors$: Subject<TError> = new Subject<TError>()
  private readonly results$ = new Subject<TResult>()
  private readonly inFlightCount$ = new BehaviorSubject<number>(0)

  constructor(
    execute: (param: TParam | undefined) => Observable<TResult>,
    canExecute: Observable<boolean> = of(true)
  ) {
    this._execute = execute

    this.isExecuting$ = this.inFlightCount$.pipe(
      map(inFlightCount => inFlightCount > 0),
      distinctUntilChanged()
    )

    this.canExecute$ = this.createCanExecute$(canExecute)
    this.results = this.results$
  }

  public static createFromObservable<TParam, TResult>(
    execute: (param?: TParam) => Observable<TResult>,
    canExecute?: Observable<boolean>
  ): ReactiveCommand<TParam, TResult> {
    return new ReactiveCommand<TParam, TResult>(execute, canExecute)
  }

  public static createFromPromise<TParam, TResult>(
    execute: (param?: TParam) => Promise<TResult>,
    canExecute?: Observable<boolean>
  ): ReactiveCommand<TParam, TResult> {
    return new ReactiveCommand<TParam, TResult>(param => from(execute(param)), canExecute)
  }

  public static create(canExecute?: Observable<boolean>): ReactiveCommand<any, any> {
    return ReactiveCommand.createFromObservable<any, any>(p => of(p), canExecute)
  }

  public execute(parameter?: TParam): Observable<TResult> {
    return defer(() => {
      this.inFlightCount$.next(this.inFlightCount$.value + 1)
      return this._execute(parameter)
    }).pipe(
      tap(result => this.results$.next(result)),
      catchError(ex => {
        this.errors$.next(ex)
        return throwError(ex)
      }),
      finalize(() => {
        this.inFlightCount$.next(this.inFlightCount$.value - 1)
      }),
      publishLast(),
      refCount()
    )
  }

  public executeAsync(parameter?: TParam): Promise<TResult> {
    return this.execute(parameter).toPromise()
  }

  private createCanExecute$(canExecute: Observable<boolean>): Observable<boolean> {
    canExecute = canExecute.pipe(
      catchError(ex => {
        this.errors$.next(ex)
        return of(false)
      }),
      startWith(true)
    )

    const canExecuteFunc = (canEx: boolean, isEx: boolean) => canEx && !isEx

    return combineLatest(canExecute, this.isExecuting$).pipe(
      map(x => canExecuteFunc(...x)),
      distinctUntilChanged(),
      publishReplay(1),
      refCount()
    )
  }
}
