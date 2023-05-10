import {knex, Knex} from "knex";
import configuration from "../configuration";

let db: Knex;

const getDatabase = async () => {
    if (db === undefined) {
        db = knex(configuration.database);
    }

    return db;
}

export default getDatabase;