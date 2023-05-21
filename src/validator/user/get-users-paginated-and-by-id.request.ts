import PaginatorRequest from "../paginator.request";
import {IsNumberString, IsOptional, IsString, Length} from "class-validator";
import {IncompatibleWith} from "incompatiblewith";

class GetUsersPaginatedAndByIdRequest extends PaginatorRequest {
    @IsOptional()
    @IsString()
    @Length(1, 64)
    search: string;

    @IsOptional()
    @IsNumberString()
    @IncompatibleWith(["search", "perPage", "currentPage"])
    id: number;
}

export default GetUsersPaginatedAndByIdRequest;