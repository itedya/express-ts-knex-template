import UserRepository from "../../../../src/interfaces/repositories/user-repository.interface";
import {Knex} from "knex";
import {
    createInTable,
    findByColumnInTable,
    getCountInTable,
    migrateDownDatabase,
    migrateUpDatabase
} from "../../../helpers/db.test-helpers";
import {v4} from "uuid";
import getDatabase from "../../../../src/database/connection";
import sqliteUserRepository from "../../../../src/repositories/sqlite/sqlite-user.repository";
import {instanceToPlain, plainToInstance} from "class-transformer";
import UserDto from "../../../../src/dtos/user.dto";
import {isNumber, isString, isStringDate, isUuid} from "../../../helpers/type.test-helpers";
import * as bcrypt from "bcrypt";
import InvalidValueException from "../../../../src/exceptions/invalid-value.exception";

describe('Sqlite user repository', function () {
    let db: Knex;
    let userRepository: UserRepository;

    beforeAll(async () => {
        db = await getDatabase();
    })

    beforeEach(async () => {
        await migrateDownDatabase(db);
        await migrateUpDatabase(db);
        userRepository = sqliteUserRepository(db);
    });

    afterAll(async () => {
        await db.destroy();
    });

    describe("Find by id function", () => {
        test("Finds user by id", async () => {
            const createdUserId = await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: v4()
            });

            const raw = await findByColumnInTable(db, "users", "id", createdUserId);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await userRepository.findById(createdUserId);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(instanceToPlain(result, {ignoreDecorators: true}))
                .toStrictEqual(instanceToPlain(plainToInstance(UserDto, raw), {ignoreDecorators: true}));
        });

        test("Returns undefined if row not found", async () => {
            const createdUserId = await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: v4()
            });

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await userRepository.findById(createdUserId + 1);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toBeUndefined();
        });
    });

    describe("Find by username function", () => {
        test("Finds user by username", async () => {
            const createdUserId = await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: v4()
            });

            const raw = await findByColumnInTable(db, "users", "id", createdUserId);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await userRepository.findByUsername("localadmin");

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(instanceToPlain(result, {ignoreDecorators: true}))
                .toStrictEqual(instanceToPlain(plainToInstance(UserDto, raw), {ignoreDecorators: true}));
        });

        test("Returns undefined if row not found", async () => {
            const createdUserId = await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: v4()
            });

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await userRepository.findByUsername("localadmin1");

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toBeUndefined();
        });
    })

    describe('Find by authentication uuid function', function () {
        test("Finds user by authentication uuid", async () => {
            const uuid = v4();
            const createdUserId = await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: uuid
            });

            const user = await findByColumnInTable(db, "users", "id", createdUserId);

            const result = await userRepository.findByAuthenticationUuid(uuid);

            expect(result).toStrictEqual(plainToInstance(UserDto, user));
        });
        test("Returns undefined if user not found", async () => {
            await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "localadmin123",
                authenticationUuid: v4()
            });

            const result = await userRepository.findByAuthenticationUuid(v4());

            expect(result).toBeUndefined();
        });
    });

    describe('Create function', function () {
        test("Creates user and returns its id", async () => {
            expect(await getCountInTable(db, "users")).toBe(0);

            const createdUserId = await userRepository.create("localadmin", "localadmin@localhost.local", "localadmin123");
            expect(await getCountInTable(db, "users")).toBe(1);

            const raw = await findByColumnInTable(db, "users", "id", createdUserId);

            expect(raw).not.toBeUndefined();
            expect(isNumber(raw.id)).toBe(true);
            expect(isString(raw.username)).toBe(true);
            expect(isString(raw.email)).toBe(true);
            expect(isString(raw.password)).toBe(true);
            expect(isUuid(raw.authenticationUuid)).toBe(true);
            expect(isStringDate(raw.createdAt)).toBe(true);
            expect(isStringDate(raw.updatedAt)).toBe(true);

            expect(raw.username).toStrictEqual("localadmin");
            expect(raw.email).toStrictEqual("localadmin@localhost.local");
            expect(bcrypt.compareSync("localadmin123", raw.password)).toBeTruthy();
        });

        test("Throws duplicated value error if username has been already taken", async () => {
            expect(await getCountInTable(db, "users")).toBe(0);

            await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "hashed_password",
                authenticationUuid: v4()
            });

            expect(await getCountInTable(db, "users")).toBe(1);

            try {
                await userRepository.create("localadmin", "localadmin2@localhost.local", "hashed_password");
                expect(false).toBeTruthy();
            } catch (err: any) {
                expect(err instanceof InvalidValueException).toBeTruthy();
                expect(err.getPropName()).toStrictEqual("username");
                expect(await getCountInTable(db, "users")).toBe(1);
            }
        });

        test("Throws duplicated value error if email has been already taken", async () => {
            expect(await getCountInTable(db, "users")).toBe(0);

            await createInTable(db, "users", {
                username: "localadmin",
                email: "localadmin@localhost.local",
                password: "hashed_password",
                authenticationUuid: v4()
            });

            expect(await getCountInTable(db, "users")).toBe(1);

            try {
                await userRepository.create("localadmin2", "localadmin@localhost.local", "hashed_password");
                expect(false).toBeTruthy();
            } catch (err: any) {
                expect(err instanceof InvalidValueException).toBeTruthy();
                expect(err.getPropName()).toStrictEqual("email");
                expect(await getCountInTable(db, "users")).toBe(1);
            }
        });
    });
});