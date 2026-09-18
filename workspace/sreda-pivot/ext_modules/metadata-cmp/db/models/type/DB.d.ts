import { DatabaseI } from "../../../../../db/models/types/db";

import { Metadata } from '../metadata'
import { FamilyMetadata } from '../familymetadata'

declare module '../../../../../db/models/types/db' {
    interface DatabaseI {
        Metadata?: Metadata,
        FamilyMetadata?: FamilyMetadata
    }
}