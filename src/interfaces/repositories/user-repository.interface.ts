import UserDto from "../../dtos/user.dto";

interface UserRepository {
    findById: (id: number) => Promise<UserDto | undefined>,
    findByUsername: (username: string) => Promise<UserDto | undefined>,
    findByEmail: (email: string) => Promise<UserDto | undefined>,
    findByAuthenticationUuid: (authenticationUuid: string) => Promise<UserDto | undefined>,
    create: (username: string, email: string, password: string) => Promise<number>
}

export default UserRepository;