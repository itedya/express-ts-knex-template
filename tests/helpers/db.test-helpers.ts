import {Knex} from "knex";
import {getMigrations} from "../../src/database/migrations";

const getCountInTable = (db: Knex, tableName: string): Promise<number> => {
    return db.table(tableName).count("* as rows").first()
        .then(res => res[`rows`]);
}

const getAllInTable = (db: Knex, tableName: string): Promise<any[]> => {
    return db.table(tableName);
}

const createInTable = (db: Knex, tableName: string, obj: object): Promise<number> => {
    return db.table(tableName).insert(obj).then(res => res[0]);
}

const findByColumnInTable = (db: Knex, tableName: string, column: string, value: string | boolean | number): Promise<any|undefined> => {
    return db.table(tableName).where(column, value).first();
}

const migrateUpDatabase = (db: Knex) => {
    return getMigrations()
        .then(async migrations => {
            for (const migration of migrations) {
                await migration.up(db);
            }
        });
}

const migrateDownDatabase = (db: Knex) => {
    return getMigrations()
        .then(async migrations => {
            for (const migration of migrations) {
                await migration.down(db);
            }
        });
}

export { getCountInTable, findByColumnInTable, createInTable, migrateUpDatabase, migrateDownDatabase, getAllInTable }