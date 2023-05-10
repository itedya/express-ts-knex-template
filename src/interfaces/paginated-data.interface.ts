interface PaginatedData<T> {
    items: T[],
    perPage: number,
    total: number,
    totalPages: number,
    currentPage: number
}

export default PaginatedData;