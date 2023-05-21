import PaginatorRequest from "../paginator.request";
import {IsOptional, IsString, Length} from "class-validator";

class GetPaginatedUsersRequest extends PaginatorRequest {
    @IsOptional()
    @IsString()
    @Length(1, 64)
    search: string;
}

export default GetPaginatedUsersRequest;