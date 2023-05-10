import UserRepository from "../repositories/user-repository.interface";
import {Knex} from "knex";

interface UnitOfWorkContext {
    trx: Knex.Transaction;
    userRepository: UserRepository;
}

export default UnitOfWorkContext;