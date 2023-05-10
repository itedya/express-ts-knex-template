import sqliteUserRepository from "./sqlite/sqlite-user.repository";
import getDatabase from "../database/connection";
import UnitOfWorkContext from "../interfaces/uow/unit-of-work-context.interface";
import UnitOfWorkCallback from "../interfaces/uow/unit-of-work-callback.interface";
import configuration from "../configuration";

const createContext = async (): Promise<UnitOfWorkContext> => {
    const trx = await getDatabase()
        .then(db => db.transaction());

    if (configuration.database.client === "sqlite") {
        const userRepository = sqliteUserRepository(trx);

        return {trx, userRepository};
    } else {
        throw new Error("Unsupported database type! Add your repositories to: src/repositories/unit-of-work.ts");
    }
}

const rollbackContext = async (ctx: UnitOfWorkContext) => {
    await ctx.trx.rollback();
}

const commitContext = async (ctx: UnitOfWorkContext) => {
    await ctx.trx.commit();
}

const unitOfWork = async <T>(callback: UnitOfWorkCallback<T>) => {
    const ctx = await createContext();

    const boundCallback = callback.bind(ctx);

    return boundCallback()
        .then(async res => {
            await commitContext(ctx);
            return res;
        })
        .catch(async err => {
            await rollbackContext(ctx);
            throw err;
        });
}

export default unitOfWork;