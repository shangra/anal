import { IDatabase } from '../../../../../db/models/types/db';

import { DBStatic } from '../../../../../core/db/rls/types/DBStatic';

import * as group from '../group';
import * as groupUser from '../groupuser';
import * as roleRule from '../rolerule';
import * as uAttribute from '../uattribute';
import * as uRole from '../urole';
import * as uRule from '../urule';
import * as user from '../user';
import * as userInfo from '../userinfo';
import * as userData from '../userdata';
import * as userRole from '../userrole';
import * as userRule from '../userrule';

export type Group = DBStatic<ReturnType<typeof group>>;
export type GroupUser = DBStatic<ReturnType<typeof groupUser>>;
export type RoleRule = DBStatic<ReturnType<typeof roleRule>>;
export type UAttribute = DBStatic<ReturnType<typeof uAttribute>>;
export type URole = DBStatic<ReturnType<typeof uRole>>;
export type URule = DBStatic<ReturnType<typeof uRule>>;
export type User = DBStatic<ReturnType<typeof user>>;
export type UserInfo = DBStatic<ReturnType<typeof userInfo>>;
export type UserData = DBStatic<ReturnType<typeof userData>>;
export type UserRole = DBStatic<ReturnType<typeof userRole>>;
export type UserRule = DBStatic<ReturnType<typeof userRule>>;

declare module '../../../../../db/models/types/db' {
    interface IDatabase {
        Group: Group;
        GroupUser: GroupUser;
        RoleRule: RoleRule;
        UAttribute: UAttribute;
        URole: URole;
        URule: URule;
        User: User;
        UserInfo: UserInfo;
        UserData: UserData;
        UserRole: UserRole;
        UserRule: UserRule;
    }
}
