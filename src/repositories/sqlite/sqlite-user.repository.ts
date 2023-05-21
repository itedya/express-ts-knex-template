import {Knex} from "knex";
import {plainToInstance} from "class-transformer";
import UserDto from "../../dtos/user.dto";
import * as bcrypt from "bcrypt";
import UserRepository from "../../interfaces/repositories/user-repository.interface";
import {v4} from "uuid";
import InvalidValueException from "../../exceptions/invalid-value.exception";
import PaginatedData from "../../interfaces/paginated-data.interface";

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
    isAdmin: boolean
): Promise<number> => {
    const hashedPassword = await bcrypt.hash(password, 12);

    return await db.insert({
        username,
        email,
        password: hashedPassword,
        authenticationUuid: v4(),
        isAdmin
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

const deleteById = (db: Knex) => (id: number) => {
    return db.table("users")
        .where("id", id)
        .del()
        .then(res => {
            if (res !== 1) {
                throw new InvalidValueException("id");
            }
        });
}

const getPaginated = (db: Knex) => (currentPage: number, perPage: number, search?: string): Promise<PaginatedData<UserDto>> => {
    const offset = perPage * (currentPage - 1);

    return Promise.all([
        db.table("users")
            .where(builder => {
                if (search !== undefined) {
                    builder.whereLike("username", `%${search}%`)
                        .orWhereLike("email", `%${search}%`)
                }
            })
            .offset(offset)
            .limit(perPage),
        db.table("users")
            .where(builder => {
                if (search !== undefined) {
                    builder.whereLike("username", `%${search}%`)
                        .orWhereLike("email", `%${search}%`)
                }
            })
            .select(db.raw("count(id) as total"))
    ]).then(([dataRows, totalRows]) => {
        dataRows = plainToInstance(UserDto, dataRows);
        const total = totalRows[0].total;
        const totalPages = Math.ceil(total / perPage);

        if (currentPage > totalPages) throw new InvalidValueException("currentPage");

        return {
            total,
            perPage,
            currentPage,
            totalPages,
            items: dataRows
        }
    });
};

const sqliteUserRepository = (db: Knex): UserRepository => ({
    create: create(db),
    findById: findById(db),
    findByUsername: findByUsername(db),
    findByEmail: findByEmail(db),
    findByAuthenticationUuid: findByAuthenticationUuid(db),
    update: update(db),
    delete: deleteById(db),
    paginated: {
        get: getPaginated(db)
    }
});

export default sqliteUserRepository;