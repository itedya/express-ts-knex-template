import UserRepository from "../../../../src/interfaces/repositories/user-repository.interface";
import {Knex} from "knex";
import {
    createInTable,
    findByColumnInTable,
    getAllInTable,
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
import createTestUserModel from "../../../helpers/models/user-model.test-helper";
import {iInRange} from "../../../helpers/general.test-helpers";

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
            await createInTable(db, "users", {
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

    // describe('Create function', function () {
    //
    //     test("Creates user and returns its id", async () => {
    //         expect(await getCountInTable(db, "users")).toBe(0);
    //
    //         const createdUserId = await userRepository.create("localadmin", "localadmin@localhost.local", "localadmin123");
    //         expect(await getCountInTable(db, "users")).toBe(1);
    //
    //         const raw = await findByColumnInTable(db, "users", "id", createdUserId);
    //
    //         expect(raw).not.toBeUndefined();
    //         expect(isNumber(raw.id)).toBe(true);
    //         expect(isString(raw.username)).toBe(true);
    //         expect(isString(raw.email)).toBe(true);
    //         expect(isString(raw.password)).toBe(true);
    //         expect(isUuid(raw.authenticationUuid)).toBe(true);
    //         expect(isStringDate(raw.createdAt)).toBe(true);
    //         expect(isStringDate(raw.updatedAt)).toBe(true);
    //
    //         expect(raw.username).toStrictEqual("localadmin");
    //         expect(raw.email).toStrictEqual("localadmin@localhost.local");
    //         expect(bcrypt.compareSync("localadmin123", raw.password)).toBeTruthy();
    //     });
    //
    //     test("Throws duplicated value error if username has been already taken", async () => {
    //         expect(await getCountInTable(db, "users")).toBe(0);
    //
    //         await createInTable(db, "users", {
    //             username: "localadmin",
    //             email: "localadmin@localhost.local",
    //             password: "hashed_password",
    //             authenticationUuid: v4()
    //         });
    //
    //         expect(await getCountInTable(db, "users")).toBe(1);
    //
    //         try {
    //             await userRepository.create("localadmin", "localadmin2@localhost.local", "hashed_password");
    //             expect(false).toBeTruthy();
    //         } catch (err: any) {
    //             expect(err instanceof InvalidValueException).toBeTruthy();
    //             expect(err.getPropName()).toStrictEqual("username");
    //             expect(await getCountInTable(db, "users")).toBe(1);
    //         }
    //     });
    //
    //     test("Throws duplicated value error if email has been already taken", async () => {
    //         expect(await getCountInTable(db, "users")).toBe(0);
    //
    //         await createInTable(db, "users", {
    //             username: "localadmin",
    //             email: "localadmin@localhost.local",
    //             password: "hashed_password",
    //             authenticationUuid: v4()
    //         });
    //
    //         expect(await getCountInTable(db, "users")).toBe(1);
    //
    //         try {
    //             await userRepository.create("localadmin2", "localadmin@localhost.local", "hashed_password");
    //             expect(false).toBeTruthy();
    //         } catch (err: any) {
    //             expect(err instanceof InvalidValueException).toBeTruthy();
    //             expect(err.getPropName()).toStrictEqual("email");
    //             expect(await getCountInTable(db, "users")).toBe(1);
    //         }
    //     });
    //
    // });

    describe('Update function', function () {
        test("Updates user, returns undefined and does not affect other rows", async () => {
            const user = await createTestUserModel(db);
            const otherUser = await createTestUserModel(db, {seed: 1});

            const result = await userRepository.update(user.id, "new_username", "new_email", true);

            expect(result).toBeUndefined();

            await expect(await getCountInTable(db, "users")).toBe(2);

            await findByColumnInTable(db, "users", "id", user.id)
                .then(res => plainToInstance(UserDto, res))
                .then(res => {
                    expect(res.id).toStrictEqual(user.id)
                    expect(res.username).toStrictEqual("new_username")
                    expect(res.email).toStrictEqual("new_email")
                    expect(res.password).toStrictEqual(user.password)
                    expect(res.isAdmin).toStrictEqual(true)
                    expect(res.authenticationUuid).not.toStrictEqual(user.authenticationUuid)
                    expect(res.createdAt).toStrictEqual(user.createdAt)
                    expect(res.updatedAt).toBeInstanceOf(Date);
                });

            await findByColumnInTable(db, "users", "id", otherUser.id)
                .then(res => plainToInstance(UserDto, res))
                .then(res => expect(res).toStrictEqual(otherUser));
        });

        test("If provided invalid id, throws invalid value exception with id prop", async () => {
            const user = await createTestUserModel(db);

            const wholeTable = await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res));

            try {
                await userRepository.update(user.id + 1, "new_username", "new_email", true);
                expect(false).toBeTruthy();
            } catch (e) {
                if (e instanceof InvalidValueException && e.getPropName() === "id") expect(true).toBeTruthy();
                else throw e;
            }

            await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res))
                .then(res => expect(res).toStrictEqual(wholeTable));
        });

        test("If provided existing username, throws invalid value exception with username prop", async () => {
            const user = await createTestUserModel(db);
            const otherUser = await createTestUserModel(db, {seed: 1});

            const wholeTable = await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res));

            try {
                await userRepository.update(otherUser.id, user.username, otherUser.email, otherUser.isAdmin);
                expect(false).toBeTruthy();
            } catch (e) {
                if (e instanceof InvalidValueException && e.getPropName() === "username") expect(true).toBeTruthy();
                else throw e;
            }

            await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res))
                .then(res => expect(res).toStrictEqual(wholeTable));
        });

        test("If provided existing email, throws invalid value exception with email prop", async () => {
            const user = await createTestUserModel(db);
            const otherUser = await createTestUserModel(db, {seed: 1});

            const wholeTable = await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res));

            try {
                await userRepository.update(otherUser.id, otherUser.username, user.email, otherUser.isAdmin);
                expect(false).toBeTruthy();
            } catch (e) {
                if (e instanceof InvalidValueException && e.getPropName() === "email") expect(true).toBeTruthy();
                else throw e;
            }

            await getAllInTable(db, "users")
                .then(res => plainToInstance(UserDto, res))
                .then(res => expect(res).toStrictEqual(wholeTable));
        });
    });

    describe('Delete function', function () {
        test("Deletes user by id", async () => {
            const user = await createTestUserModel(db, {seed: 0});
            const otherUser = await createTestUserModel(db, {seed: 1});

            const result = await userRepository.delete(user.id);

            expect(result).toBeUndefined();

            expect(
                await getAllInTable(db, "users")
                    .then(res => plainToInstance(UserDto, res))
            ).toStrictEqual([otherUser]);
        });

        test("Throws invalid value exception if provided id is invalid", async () => {
            const user = await createTestUserModel(db, {seed: 0});

            try {
                await userRepository.delete(user.id + 1);
                expect(true).toBeFalsy();
            } catch (e) {
                if (e instanceof InvalidValueException && e.getPropName() === "id") {
                    expect(true).toBeTruthy();
                } else {
                    throw e;
                }
            }

            expect(
                await getAllInTable(db, "users")
                    .then(res => plainToInstance(UserDto, res))
            ).toStrictEqual([user]);
        });
    });

    describe('Paginated functions', function () {
        describe('Get paginated users function', function () {
            test("Returns paginated users (with search)", async () => {
                let users = await Promise.all(iInRange(1, 20)
                    .map((seed) => createTestUserModel(db, {seed})));

                let result = await userRepository.paginated.get(1, 10);

                expect(result.items).toStrictEqual(users.slice(0, 10));
                expect(result.total).toStrictEqual(20);
                expect(result.perPage).toStrictEqual(10);
                expect(result.totalPages).toStrictEqual(2);
                expect(result.currentPage).toStrictEqual(1);

                result = await userRepository.paginated.get(2, 5);

                expect(result.items).toStrictEqual(users.slice(5, 10));
                expect(result.total).toStrictEqual(20);
                expect(result.perPage).toStrictEqual(5);
                expect(result.totalPages).toStrictEqual(4);
                expect(result.currentPage).toStrictEqual(2);

                result = await userRepository.paginated.get(1, 5, "1");
                expect(result.items).toStrictEqual([users[0], ...users.slice(10 - 1, 14 - 1)]);
                expect(result.total).toStrictEqual(11);
                expect(result.perPage).toStrictEqual(5);
                expect(result.totalPages).toStrictEqual(3);
                expect(result.currentPage).toStrictEqual(1);
            });

            test("Throws invalid value exception with currentPage property if current page attr is too big", async () => {
                await Promise.all(iInRange(1, 20)
                    .map((seed) => createTestUserModel(db, {seed})));

                try {
                    await userRepository.paginated.get(4, 5, "1");
                    expect(true).toBeFalsy();
                } catch (e) {
                    if (e instanceof InvalidValueException && e.getPropName() === "currentPage") {
                        expect(true).toBeTruthy();
                    } else {
                        throw e;
                    }
                }
            });
        });
    });
});