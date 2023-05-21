import {Knex} from "knex";
import {Express} from "express";
import getDatabase from "../src/database/connection";
import {
    findByColumnInTable,
    getAllInTable,
    getCountInTable,
    migrateDownDatabase,
    migrateUpDatabase
} from "./helpers/db.test-helpers";
import createApp from "../src/app";
import supertest from "supertest";
import createTestUserModel, {createAuthenticationToken} from "./helpers/models/user-model.test-helper";
import {iInRange, serialize} from "./helpers/general.test-helpers";
import {plainToInstance} from "class-transformer";
import UserDto from "../src/dtos/user.dto";
import bcrypt from "bcrypt";
import {isUuid} from "./helpers/type.test-helpers";
import {BadRequestCodes} from "../src/exceptions/bad-request.http-exception";

describe('User controller', function () {
    let db: Knex;
    let app: Express;

    beforeAll(async () => {
        db = await getDatabase();
        app = await createApp();
    });

    beforeEach(async () => {
        await migrateDownDatabase(db);
        await migrateUpDatabase(db);
    });

    afterAll(async () => {
        await db.destroy();
    });

    describe('GET / - Get paginated users', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .get("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            })
        });

        test("Throws forbidden when not an admin", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .get("/user")
                .set("Authorization", `Bearer ${token}`)
                .expect(403)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Gets paginated users with paginator defaults", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});

            const allUsers = await Promise.all([
                user,
                ...iInRange(2, 20).map(i => createTestUserModel(db, {seed: i}))
            ]);

            const token = await createAuthenticationToken(user.authenticationUuid);

            let result = await supertest(app)
                .get("/user")
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize([user, ...allUsers.slice(1, 5)]),
                total: 20,
                totalPages: 4,
                perPage: 5,
                currentPage: 1,
            });
        });

        test("Gets paginated users with custom paginator options", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});

            const allUsers = await Promise.all([
                user,
                ...iInRange(2, 20).map(i => createTestUserModel(db, {seed: i}))
            ]);

            const token = await createAuthenticationToken(user.authenticationUuid);

            let params = new URLSearchParams();
            params.set("perPage", "8");
            params.set("currentPage", "3");

            let result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(16)),
                total: 20,
                totalPages: 3,
                perPage: 8,
                currentPage: 3,
            });
        });

        test("Gets paginated users with search", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const allUsers = await Promise.all([
                ...iInRange(1, 10).map(i => createTestUserModel(db, {seed: i})),
                ...iInRange(10, 19).map(i => createTestUserModel(db, {
                    baseUsername: "localuser%seed%",
                    baseEmail: "localuser%seed%@localhost.local",
                    seed: i
                }))
            ]);

            let params = new URLSearchParams();
            params.set("perPage", "8");
            params.set("currentPage", "1");
            params.set("search", "user");

            let result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(10, 18)),
                total: 10,
                totalPages: 2,
                perPage: 8,
                currentPage: 1,
            });

            params.set("currentPage", "2");

            result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(18, 20)),
                total: 10,
                totalPages: 2,
                perPage: 8,
                currentPage: 2,
            });
        })
    });

    describe('POST / - Create user', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .post("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            });
        });

        test("Throws forbidden when not an admin", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .expect(403)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Creates user successfully", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: false
                })
                .expect(200)
                .then(res => res.body);

            const createdUser = await findByColumnInTable(db, "users", "id", user.id + 1)
                .then(res => plainToInstance(UserDto, res));

            expect(createdUser.id).toStrictEqual(user.id + 1);
            expect(createdUser.username).toStrictEqual("localadmin");
            expect(createdUser.email).toStrictEqual("localadmin@localhost.local");
            expect(await bcrypt.compare("localadmin123", createdUser.password)).toBeTruthy();
            expect(await isUuid(createdUser.authenticationUuid)).toBeTruthy();
            expect(createdUser.isAdmin).toBeFalsy();
            expect(await createdUser.createdAt).toBeInstanceOf(Date);
            expect(await createdUser.updatedAt).toBeInstanceOf(Date);

            expect(result).toStrictEqual(serialize(createdUser));
        });

        test("Creates admin user successfully", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: true
                })
                .expect(200)
                .then(res => res.body);

            const createdUser = await findByColumnInTable(db, "users", "id", user.id + 1)
                .then(res => plainToInstance(UserDto, res));

            expect(createdUser.id).toStrictEqual(user.id + 1);
            expect(createdUser.username).toStrictEqual("localadmin");
            expect(createdUser.email).toStrictEqual("localadmin@localhost.local");
            expect(await bcrypt.compare("localadmin123", createdUser.password)).toBeTruthy();
            expect(await isUuid(createdUser.authenticationUuid)).toBeTruthy();
            expect(createdUser.isAdmin).toBeTruthy();
            expect(await createdUser.createdAt).toBeInstanceOf(Date);
            expect(await createdUser.updatedAt).toBeInstanceOf(Date);

            expect(result).toStrictEqual(serialize(createdUser));
        });

        test("Throws bad request when username is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin0",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_USERNAME_ALREADY_TAKEN]
            });
        });

        test("Throws bad request when email is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin0@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_EMAIL_ALREADY_TAKEN]
            });
        });
    });

    describe('PUT / - Update user', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .put("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            });
        });

        test("Throws forbidden when not an admin and trying to edit not logged in user", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const otherUser = await createTestUserModel(db, {seed: 1});

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: otherUser.id,
                    username: otherUser.username,
                    email: otherUser.email,
                    isAdmin: otherUser.isAdmin
                })
                .expect(403)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Updates logged in user successfully", async () => {
            const user = await createTestUserModel(db, {isAdmin: false});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: user.id,
                    username: "new_username",
                    email: "new_email@localhost.local",
                    isAdmin: user.isAdmin
                })
                .expect(200)
                .then(res => res.body);

            const updatedUser = await findByColumnInTable(db, "users", "id", user.id)
                .then(res => plainToInstance(UserDto, res));

            expect(updatedUser.username).toStrictEqual("new_username");
            expect(updatedUser.email).toStrictEqual("new_email@localhost.local");
            expect(updatedUser.password).toStrictEqual(user.password);
            expect(updatedUser.isAdmin).toStrictEqual(false);

            expect(updatedUser.authenticationUuid).not.toStrictEqual(user.authenticationUuid);

            expect(isUuid(user.authenticationUuid)).toBeTruthy();
            expect(updatedUser.updatedAt).toBeInstanceOf(Date);
            expect(updatedUser.createdAt).toStrictEqual(user.createdAt);

            const serializedUser = serialize(updatedUser);
            delete serializedUser.password;
            delete serializedUser.authenticationUuid;

            expect(result).toStrictEqual(serializedUser);
        });

        test("Updates another user successfully when logged in user is an admin", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const otherUser = await createTestUserModel(db, {isAdmin: false, seed: 1})

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: otherUser.id,
                    username: "new_username",
                    email: "new_email@localhost.local",
                    isAdmin: true
                })
                .expect(200)
                .then(res => res.body);

            expect(await findByColumnInTable(db, "users", "id", user.id)
                .then(res => plainToInstance(UserDto, res))).toStrictEqual(user);

            const updatedUser = await findByColumnInTable(db, "users", "id", otherUser.id)
                .then(res => plainToInstance(UserDto, res));

            expect(updatedUser.id).toStrictEqual(otherUser.id);
            expect(updatedUser.username).toStrictEqual("new_username");
            expect(updatedUser.email).toStrictEqual("new_email@localhost.local");
            expect(updatedUser.password).toStrictEqual(otherUser.password);
            expect(updatedUser.isAdmin).toBeTruthy();

            expect(updatedUser.authenticationUuid).not.toStrictEqual(user.authenticationUuid);

            expect(isUuid(user.authenticationUuid)).toBeTruthy();
            expect(updatedUser.updatedAt).toBeInstanceOf(Date);
            expect(updatedUser.createdAt).toStrictEqual(user.createdAt);

            serialize(updatedUser)

            expect(result).toStrictEqual(serialize(updatedUser));
        })

        test("Throws forbidden exception when trying to edit isAdmin without being an admin", async () => {
            const user = await createTestUserModel(db, {isAdmin: false});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: user.id,
                    username: "new_username",
                    email: "new_email@localhost.local",
                    isAdmin: true
                })
                .expect(403)
                .then(res => res.body);

            expect(await findByColumnInTable(db, "users", "id", user.id)
                .then(res => plainToInstance(UserDto, res))).toStrictEqual(user);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            })
        });

        test("Throws bad request when username is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            await createTestUserModel(db, {seed: 1});

            const before = await getAllInTable(db, "users");

            expect(await getCountInTable(db, "users")).toBe(2);

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: user.id,
                    username: "localadmin1",
                    email: "localadmin@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(2);
            expect(await getAllInTable(db, "users")).toStrictEqual(before);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_USERNAME_ALREADY_TAKEN]
            });
        });

        test("Throws bad request when email is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            await createTestUserModel(db, {seed: 1});

            const before = await getAllInTable(db, "users");

            expect(await getCountInTable(db, "users")).toBe(2);

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: user.id,
                    username: "localadmin",
                    email: "localadmin1@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(2);
            expect(await getAllInTable(db, "users")).toStrictEqual(before);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_EMAIL_ALREADY_TAKEN]
            });
        });

        test("Throws bad request when provided id is invalid", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const before = await getAllInTable(db, "users");

            const result = await supertest(app)
                .put("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    id: user.id + 1,
                    username: "new_username",
                    email: "new_email@localhost.local",
                    isAdmin: true
                })
                .expect(400)
                .then(res => res.body);

            expect(await getAllInTable(db, "users")).toStrictEqual(before);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.MODEL_DOES_NOT_EXIST]
            })
        });
    });

    describe('DELETE / - Delete user', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .delete("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            });
        });

        test("Throws forbidden when not an admin and trying to delete not logged in user", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const otherUser = await createTestUserModel(db, {seed: 1});

            const before = await getAllInTable(db, "users");

            const result = await supertest(app)
                .delete("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({id: otherUser.id})
                .expect(403)
                .then(res => res.body);

            expect(await getAllInTable(db, "users")).toStrictEqual(before);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Removes user that is logged in when not an admin", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            expect(await getCountInTable(db, "users")).toStrictEqual(1);

            const result = await supertest(app)
                .delete("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({id: user.id})
                .expect(204)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toStrictEqual(0);

            expect(result).toStrictEqual({});
        });

        test("Removes any user when logged in user is admin", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const otherUser = await createTestUserModel(db, {isAdmin: true, seed: 1});

            const before = await getAllInTable(db, "users");

            const response = await supertest(app)
                .delete("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({id: otherUser.id})
                .expect(204)
                .then(res => res.body);

            expect(response).toStrictEqual({});

            const after = await getAllInTable(db, "users");

            expect(after).not.toStrictEqual(before)
            expect(after.map(e => plainToInstance(UserDto, e))).toStrictEqual([user]);
        });

        test("Throws bad request when provided id is invalid", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const before = await getAllInTable(db, "users");

            const response = await supertest(app)
                .delete("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({id: user.id + 1})
                .expect(400)
                .then(res => res.body);

            expect(await getAllInTable(db, "users")).toStrictEqual(before);

            expect(response).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.MODEL_DOES_NOT_EXIST]
            });
        });
    });
});