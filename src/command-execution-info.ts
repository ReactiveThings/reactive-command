import { Observable } from 'rxjs';

export interface CommandExecutionInfo<T> {
    results: Observable<T>;

    canExecute: Observable<boolean>;

    isExecuting: Observable<boolean>;

    errors: Observable<any>;
}
