import { of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { ReactiveCommand } from '../src'
import { concat } from 'rxjs/operators'

const trueFalse = { f: false, t: true }

describe('Reactive Command', () => {
  let testScheduler: TestScheduler
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })
  describe('createFromObservable', () => {
    it('when command is executing then function is called with command parameter', () => {
      testScheduler.run(() => {
        const funcMock = jest.fn(param => of(param))
        const command = ReactiveCommand.createFromObservable(funcMock)

        command.execute(false).subscribe()

        expect(funcMock).toBeCalledWith(false)
      })
    })
    it('can pass can execute observable', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const canExecute = cold('f----', trueFalse)
        const command = ReactiveCommand.createFromObservable(param => of(param), canExecute)

        expectObservable(command.canExecute).toBe('(tf)', trueFalse)
      })
    })
  })

  describe('createFromPromise', () => {
    it('when command is executing then function is called with command parameter', () => {
      testScheduler.run(() => {
        const funcMock = jest.fn(() => Promise.resolve())
        const command = ReactiveCommand.createFromPromise(funcMock)

        command.execute(false).subscribe()

        expect(funcMock).toBeCalledWith(false)
      })
    })
    it('can pass can execute observable', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const canExecute = cold('f----', trueFalse)
        const command = ReactiveCommand.createFromPromise(() => Promise.resolve(), canExecute)

        expectObservable(command.canExecute).toBe('(tf)', trueFalse)
      })
    })
  })

  describe('create', () => {
    it('can pass can execute observable', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const canExecute = cold('f----', trueFalse)
        const command = ReactiveCommand.create(canExecute)
        expectObservable(command.execute())
        expectObservable(command.canExecute).toBe('(tf)', trueFalse)
      })
    })
  })

  describe('errors', () => {
    it('can specify type of an error on reactive command creation', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const error = new Error()
        const executeMarble = '--#'
        const errorsMarble = '--e'

        const execute = cold(executeMarble, undefined, error)
        const command = new ReactiveCommand<number, string, Error>(() => execute)
        expectObservable(command.execute())

        expectObservable(command.errors).toBe(errorsMarble, { e: error })
      })
    })

    it('when observable throws exception then errors emits object with an error', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const error = new Error()
        const executeMarble = '--#'
        const errorsMarble = '--e'

        const execute = cold(executeMarble, undefined, error)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.execute())

        expectObservable(command.errors).toBe(errorsMarble, { e: error })
      })
    })

    it('when function throws an exception then exception is emited', () => {
      testScheduler.run(({ expectObservable }) => {
        const error = new Error()
        const errorsMarble = 'e'

        const command = ReactiveCommand.createFromObservable(() => {
          throw error
        })

        expectObservable(command.errors).toBe(errorsMarble, { e: error })
        expectObservable(command.execute()).toBe('#', undefined, error)
      })
    })
  })

  describe('executeAsync', () => {
    it('execute command and emits last value from observable', async () => {
      const command = ReactiveCommand.createFromObservable(() => of(true).pipe(concat(of(false))))
      const result = await command.executeAsync()
      expect(result).toBe(false)
    })
  })

  describe('subscribe', () => {
    it('has same values as source observable', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = 't-f-t|'

        const execute = cold(executeMarble, trueFalse)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.execute())

        expectObservable(command.results).toBe('t-f-t', trueFalse)
      })
    })
  })

  describe('isExecuting', () => {
    it('when command is not executing then returns false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '-----'
        const isExecutingMarble = 'f'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)

        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
      })
    })

    it('when command is executing returns true, when observable is completed then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '------a----|'
        const isExecutingMarble = '(ft)-------f'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute())
      })
    })

    it('when command is unsubscribed before observable completes then immediately return false and unsubscribe from source', () => {
      testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
        const executeMarble = '------a----|'
        const isExecutingMarble = '(ft)-f'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute(), '^----!')
        expectSubscriptions(execute.subscriptions).toBe('^----!')
      })
    })

    it('when command is executing returns true, when observable ends with an error then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '-----------#'
        const isExecutingMarble = '(ft)-------f'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute())
      })
    })

    it('when execute is unsubscribed before observable emit value then is executing return false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '---a-|'
        const isExecutingMarble = '(ft)-f'

        const command = ReactiveCommand.createFromObservable(() => cold(executeMarble))
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute(), '^----!')
      })
    })

    it('when first execute is unsubscribed before observable emits then returns false when second command is finished', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '------a-|'
        const isExecutingMarble = '(ft)-----f'

        const command = ReactiveCommand.createFromObservable(() => cold(executeMarble))

        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute(), '^')
        expectObservable(command.execute(), '-^')
      })
    })

    it('when all commands has been executed sucessfully then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '----a-|'
        const isExecutingMarble = '(ft)---f'

        const command = ReactiveCommand.createFromObservable(() => cold(executeMarble))

        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute(), '^').toBe('------(a|)')
        expectObservable(command.execute(), '-^').toBe('-------(a|)')
      })
    })

    it('when all commands has been executed ( first with an error ) then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '----#'
        const executeMarble1 = '-----a-|'
        const isExecutingMarble = '(ft)---f'
        let i = 0
        const execute = () => cold(i++ % 2 === 0 ? executeMarble : executeMarble1)
        const command = ReactiveCommand.createFromObservable(execute)
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute()).toBe('----#')
        expectObservable(command.execute()).toBe('-------(a|)')
      })
    })

    it('when all commands has been executed ( second with an error ) then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '----a-|'
        const executeMarble1 = '--------#'
        const isExecutingMarble = '(ft)----f'
        let i = 0
        const execute = () => cold(i++ % 2 === 0 ? executeMarble : executeMarble1)
        const command = ReactiveCommand.createFromObservable(execute)
        expectObservable(command.isExecuting).toBe(isExecutingMarble, trueFalse)
        expectObservable(command.execute()).toBe('------(a|)')
        expectObservable(command.execute()).toBe('--------#')
      })
    })
  })

  describe('canExecute', () => {
    it('when command is not executing then returns true', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '-----'
        const canExecuteMarble = 't'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)

        expectObservable(command.canExecute).toBe(canExecuteMarble, trueFalse)
      })
    })

    it('when command is executing returns true, when command is finished then emits false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const executeMarble = '  -a|'
        const executeSubscription = '--^--'
        const canExecuteMarble = 't-f-t'

        const execute = cold(executeMarble)
        const command = ReactiveCommand.createFromObservable(() => execute)
        expectObservable(command.execute(), executeSubscription)
        expectObservable(command.canExecute).toBe(canExecuteMarble, trueFalse)
      })
    })

    it('when command is not executing then emits same values as input observable', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const canExecuteMarble = 't-f--t'
        const resultMarble = 't-f--t'

        const canExecute = cold(canExecuteMarble, trueFalse)
        const command = ReactiveCommand.createFromObservable(() => of(), canExecute)

        expectObservable(command.canExecute).toBe(resultMarble, trueFalse)
      })
    })

    it('when command is not executing and input canExecute observable completes then can execute does not emits complete value', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const canExecuteMarble = 't-f'

        const canExecute = cold('t-f|', trueFalse)
        const command = ReactiveCommand.createFromObservable(() => of(), canExecute)

        expectObservable(command.canExecute).toBe(canExecuteMarble, trueFalse)
      })
    })

    it('when command is executing and input canExecute observable emits true value then value is ignored', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const expectedCanExecuteMarble = '(tf)-t'
        const inputCanExecuteMarble = '----t-'
        const executeMarble = '-----|'

        const canExecute = cold(inputCanExecuteMarble, trueFalse)
        const command = ReactiveCommand.createFromObservable(() => cold(executeMarble), canExecute)
        expectObservable(command.canExecute).toBe(expectedCanExecuteMarble, trueFalse)
        expectObservable(command.execute())
      })
    })

    it('when command is executing and input canExecute observable emits false then after execution do not emits true', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const expectedCanExecuteMarble = 'tf-'
        const inputCanExecuteMarble = '-f'
        const executeMarble = '---|'

        const canExecute = cold(inputCanExecuteMarble, trueFalse)
        const command = ReactiveCommand.createFromObservable(() => cold(executeMarble), canExecute)

        expectObservable(command.execute())
        expectObservable(command.canExecute).toBe(expectedCanExecuteMarble, trueFalse)
      })
    })

    it('when source observable returns an error then returns false', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const sourceCanExecuteMarble = '-#----'
        const canExecuteMarble = 'tf'

        const canExecute = cold(sourceCanExecuteMarble, trueFalse)
        const command = ReactiveCommand.createFromObservable(() => of(), canExecute)

        expectObservable(command.canExecute).toBe(canExecuteMarble, trueFalse)
      })
    })
  })

  it('execute observable returns last value of source observable', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const inputMarble = 'a-b|'
      const expected = '---(b|)'
      const input = cold(inputMarble, { a: true })
      const command = ReactiveCommand.createFromObservable(() => input)
      const $execute = command.execute()
      expectObservable($execute).toBe(expected, { a: true })
    })
  })
})
