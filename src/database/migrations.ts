import {Knex} from "knex";
import getDatabase from "./connection";

interface Migration {
    up: (knex: Knex) => Promise<any>,
    down: (knex: Knex) => Promise<any>,
}

const getMigrations = async () => {
    const migrations: Promise<Migration>[] = [
        import("./migrations/create-users-table.migration"),
    ];

    return Promise.all(migrations);
}

const migrate = async () => {
    const db = await getDatabase();
    const migrations = await getMigrations();

    for (const migration of migrations) {
        await migration.up(db);
    }
}

export {
    migrate as default,
    getMigrations
}