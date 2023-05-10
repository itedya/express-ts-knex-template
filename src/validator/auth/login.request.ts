import {IsString, IsStrongPassword, Length} from "class-validator";

class LoginRequest {
    @IsString()
    @Length(3, 64)
    login: string;

    @IsString()
    @Length(8, 64)
    @IsStrongPassword({
        minLength: 8,
        minNumbers: 2,
        minSymbols: 1,
        minUppercase: 1,
        minLowercase: 1
    })
    password: string;
}

export default LoginRequest;