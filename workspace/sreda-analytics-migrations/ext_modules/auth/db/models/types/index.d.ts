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
export type RoleRules = DBStatic<ReturnType<typeof roleRule>>;
export type UAttributes = DBStatic<ReturnType<typeof uAttribute>>;
export type URoles = DBStatic<ReturnType<typeof uRole>>;
export type URules = DBStatic<ReturnType<typeof uRule>>;
export type Users = DBStatic<ReturnType<typeof user>>;
export type UserInfos = DBStatic<ReturnType<typeof userInfo>>;
export type UserData = DBStatic<ReturnType<typeof userData>>;
export type UserRole = DBStatic<ReturnType<typeof userRole>>;
export type UserRules = DBStatic<ReturnType<typeof userRule>>;

declare module '../../../../../db/models/types/db' {
    interface IDatabase {
        Group: Group;
        GroupUser: GroupUser;
        RoleRules: RoleRules;
        UAttributes: UAttributes;
        URoles: URoles;
        URules: URules;
        Users: Users;
        UserInfos: UserInfos;
        UserData: UserData;
        UserRole: UserRole;
        UserRules: UserRules;
    }
}
