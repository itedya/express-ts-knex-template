import UnitOfWorkContext from "./unit-of-work-context.interface";

interface UnitOfWorkCallback<T> {
    (this: UnitOfWorkContext): Promise<T>
}

export default UnitOfWorkCallback;