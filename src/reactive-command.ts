
import {
  Subject,
  throwError,
  of,
  from,
  combineLatest,
  defer,
  Observable
} from 'rxjs';
import {
  catchError,
  startWith,
  distinctUntilChanged,
  publishReplay,
  refCount,
  map,
  scan,
  filter,
  tap,
  finalize,
  publishLast
} from 'rxjs/operators';
import { Command } from './command';
import { ExecutionInfo } from './internal/execution-info'
import { ExecutionDemarcation } from './internal/execution-demarcation';

export class ReactiveCommand<TParam, TResult> implements Command<TParam, TResult> {
  private readonly _execute: (param: TParam | undefined) => Observable<TResult>;

  private readonly isExecuting$: Observable<boolean>;
  private readonly canExecute$: Observable<boolean>;
  public readonly results: Observable<TResult>;
  private readonly exceptions$: Subject<any> = new Subject<any>();
  private readonly executionInfo$ = new Subject<ExecutionInfo<TResult>>();

  constructor(execute: (param: TParam | undefined) => Observable<TResult>, canExecute: Observable<boolean> = of(true)) {
    this._execute = execute;

    this.isExecuting$ = this.createIsExecuting$();
    this.canExecute$ = this.createCanExecute$(canExecute);
    this.results = this.createResult$();
    this.canExecute$.subscribe();
  }


  public static createFromObservable<TParam, TResult>(execute: (param?: TParam) => Observable<TResult>, canExecute?: Observable<boolean>): Command<TParam, TResult> {
    return new ReactiveCommand<TParam, TResult>(execute, canExecute);
  }

  public static createFromPromise<TParam, TResult>(execute: (param?: TParam) => Promise<TResult>, canExecute?: Observable<boolean>): Command<TParam, TResult> {
    return new ReactiveCommand<TParam, TResult>((param) => from(execute(param)), canExecute);
  }

  public static create(canExecute?: Observable<boolean>): Command<any, any> {
    return ReactiveCommand.createFromObservable<any, any>(p => of(p), canExecute);
  }

  get canExecute(): Observable<boolean> {
    return this.canExecute$;
  }

  get isExecuting(): Observable<boolean> {
    return this.isExecuting$;
  }

  get errors(): Observable<any> {
    return this.exceptions$;
  }

  public execute(parameter?: TParam): Observable<any> {
    return defer(
      () => {
        this.executionInfo$.next(ExecutionInfo.CreateBegin<TResult>());
        return this._execute(parameter);
      }).pipe(
        tap(result => this.executionInfo$.next(ExecutionInfo.CreateResult(result))),
        catchError(ex => {
            this.exceptions$.next(ex);
            return throwError(ex);
          }),
        finalize(() => this.executionInfo$.next(ExecutionInfo.CreateEnd<TResult>())),
        publishLast(),
        refCount()
      );
  }

  public executeAsync(parameter?: TParam): Promise<TResult> {
    return this.execute(parameter).toPromise();
  }


  private createResult$() {
    return this
      .executionInfo$.pipe(
        filter((x: ExecutionInfo<TResult>) => x.Demarcation === ExecutionDemarcation.Result),
        map((x: ExecutionInfo<TResult>) => x.Result as TResult)
      );
  }

  private createIsExecuting$() {
    return this.executionInfo$.pipe(
      scan((acc: number, next: ExecutionInfo<TResult>) => {
        if (next.Demarcation === ExecutionDemarcation.Begin) {
          return acc + 1;
        }

        if (next.Demarcation === ExecutionDemarcation.End) {
          return acc - 1;
        }
        return acc;
      }, 0),
      map((inFlightCount: number) => inFlightCount > 0),
      startWith(false),
      distinctUntilChanged(),
      publishReplay(1),
      refCount()
    );
  }

  private createCanExecute$(canExecute: Observable<boolean>) {
    canExecute = canExecute.pipe(
      catchError(ex => {
        this.exceptions$.next(ex);
        return of(false);
      }),
      startWith(false)
    )

    const canExecuteFunc = (canEx: boolean, isEx: boolean) => canEx && !isEx;

    return combineLatest(canExecute, this.isExecuting$)
      .pipe(
        map(x => canExecuteFunc(...x)),
        distinctUntilChanged(),
        publishReplay(1),
        refCount()
      );
  }

}
