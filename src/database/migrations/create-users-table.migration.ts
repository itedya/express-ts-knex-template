import { Knex } from "knex";
import generateUpdatedAtTrigger from "./updated-at-trigger.helper";

const up = async (knex: Knex) => {
    const exists = await knex.schema.hasTable("users");
    if (exists) return;

    return knex.schema.createTable("users", (table) => {
        table.increments();
        table.string("username", 64).notNullable().unique();
        table.string("email", 320).notNullable().unique();
        table.string("password", 72).notNullable();
        table.boolean("isAdmin").defaultTo(false).notNullable();
        table.uuid("authenticationUuid").notNullable();
        table.datetime("createdAt").defaultTo(knex.fn.now()).notNullable();
        table.datetime("updatedAt").defaultTo(knex.fn.now()).notNullable();
    })
        .then(() => knex.raw(generateUpdatedAtTrigger(knex, "users")));
}

const down = async (knex: Knex) => {
    const exists = await knex.schema.hasTable("users");
    if (!exists) return;
    return knex.schema.dropTable("users");
}

export { up, down }