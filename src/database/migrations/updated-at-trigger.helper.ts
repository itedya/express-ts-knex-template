import {Knex} from "knex";

const generateUpdatedAtTrigger = (knex: Knex, schemaName: string) => {
    return `CREATE TRIGGER ${schemaName}_updated_at 
    BEFORE UPDATE 
    ON ${schemaName}
    BEGIN
        UPDATE ${schemaName} SET updatedAt = ${knex.fn.now()} WHERE id = NEW.id;
    END;`;
};

export default generateUpdatedAtTrigger;