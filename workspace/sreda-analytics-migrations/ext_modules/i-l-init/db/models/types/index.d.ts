import { ModelStatic } from "sequelize";
import { IModels } from "../../../../../core/db/models/types";

import explainrequestmodel from "../ExplainRequest";
import explainrequestmetamodel from "../ExplainRequestMeta";

type TExplainRequestModel = ModelStatic<InstanceType<ReturnType<typeof explainrequestmodel>>>;
type TExplainRequestMetaModel = ModelStatic<InstanceType<ReturnType<typeof explainrequestmetamodel>>>;

declare module "../../../../../core/db/models/types" {
    interface IModels {
        ExplainRequest: TExplainRequestModel;
        ExplainRequestMeta: TExplainRequestMetaModel;
    }
}