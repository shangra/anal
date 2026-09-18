export const buildQuery = (queryObj) => {
    const queryParams = Object.entries(queryObj).map(([paramName, paramValue]) => `${paramName}=${paramValue}`);
    return queryParams.length === 0 ? '' : `?${queryParams.join('&')}`;
};
