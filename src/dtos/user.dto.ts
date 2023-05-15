import UserDef from "../definitions/user.def";
import {Exclude, Type} from "class-transformer";

class UserDto implements UserDef {
    id: number;
    username: string;
    email: string;

    @Exclude({toPlainOnly: true})
    password: string;

    @Exclude({toPlainOnly: true})
    authenticationUuid: string;

    @Type(() => Boolean)
    isAdmin: boolean;

    @Type(() => Date)
    createdAt: Date;

    @Type(() => Date)
    updatedAt: Date;
}

export default UserDto;