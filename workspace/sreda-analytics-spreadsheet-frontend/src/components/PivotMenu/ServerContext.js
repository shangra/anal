import React from 'react';

const ServerContext = React.createContext('pivot');

export const ServerContextProvider = ServerContext.Provider;
export const ServerContextConsumer = ServerContext.Consumer;

export default ServerContext;
