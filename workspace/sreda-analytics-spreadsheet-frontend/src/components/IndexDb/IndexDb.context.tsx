import { createContext } from 'react';

import IndexDbService from '.';

/**
 * Контекст indexDb
 */
export const IndexDbContext = createContext<IndexDbService | null>(null);
