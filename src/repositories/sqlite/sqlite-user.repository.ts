import {Knex} from "knex";
import {plainToInstance} from "class-transformer";
import UserDto from "../../dtos/user.dto";
import * as bcrypt from "bcrypt";
import UserRepository from "../../interfaces/repositories/user-repository.interface";
import {v4} from "uuid";
import InvalidValueException from "../../exceptions/invalid-value.exception";

const findById = (db: Knex) => async (id: number): Promise<UserDto | undefined> => {
    const result = await db.select("*")
        .from("users")
        .where("id", id)
        .first();

    if (result === undefined) {
        return undefined;
    }

    return plainToInstance(UserDto, result);
}

const create = (db: Knex) => async (
    username: string,
    email: string,
    password: string,
): Promise<number> => {
    const hashedPassword = await bcrypt.hash(password, 12);

    return await db.insert({
        username,
        email,
        password: hashedPassword,
        authenticationUuid: v4(),
    }, ['id'])
        .into("users")
        .then(rows => rows[0]['id'])
        .catch(err => {
            if (err.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username")) {
                throw new InvalidValueException("username");
            } else if (err.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email")) {
                throw new InvalidValueException("email");
            } else throw err;
        });
}

const findByUsername = (db: Knex) => async (username: string): Promise<UserDto | undefined> => {
    const result = await db.select("*")
        .from("users")
        .where("username", username)
        .first();

    if (result === undefined) return undefined;

    return plainToInstance(UserDto, result);
}

const findByEmail = (db: Knex) => async (email: string): Promise<UserDto | undefined> => {
    const result = await db.select("*")
        .from("users")
        .where("email", email)
        .first();

    if (result === undefined) return undefined;

    return plainToInstance(UserDto, result);
}

const findByAuthenticationUuid = (db: Knex) => async (authenticationUuid: string): Promise<UserDto | undefined> => {
    const result = await db.select("*")
        .from("users")
        .where("authenticationUuid", authenticationUuid)
        .first();

    if (result === undefined) return undefined;

    return plainToInstance(UserDto, result);
}

const update = (db: Knex) => async (id: number, username: string, email: string, isAdmin: boolean) => {
    return db
        .update({
            username,
            email,
            isAdmin,
            authenticationUuid: v4()
        })
        .table("users")
        .where("id", id)
        .then(affectedRows => {
            if (affectedRows !== 1) {
                throw new InvalidValueException("id");
            }
        })
        .catch(err => {
            if (err.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username")) {
                throw new InvalidValueException("username");
            } else if (err.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email")) {
                throw new InvalidValueException("email");
            } else throw err;
        });
}

const sqliteUserRepository = (db: Knex): UserRepository => ({
    create: create(db),
    findById: findById(db),
    findByUsername: findByUsername(db),
    findByEmail: findByEmail(db),
    findByAuthenticationUuid: findByAuthenticationUuid(db),
    update: update(db)
});

export default sqliteUserRepository;