import UserDto from "../../dtos/user.dto";
import PaginatedData from "../paginated-data.interface";

interface UserRepository {
    findById: (id: number) => Promise<UserDto | undefined>,
    findByUsername: (username: string) => Promise<UserDto | undefined>,
    findByEmail: (email: string) => Promise<UserDto | undefined>,
    findByAuthenticationUuid: (authenticationUuid: string) => Promise<UserDto | undefined>,
    create: (username: string, email: string, password: string) => Promise<number>,
    update: (id: number, username: string, email: string, isAdmin: boolean) => Promise<void>,
    delete: (id: number) => Promise<void>,
    paginated: {
        get: (currentPage: number, perPage: number, search?: string) => Promise<PaginatedData<UserDto>>
    }
}

export default UserRepository;