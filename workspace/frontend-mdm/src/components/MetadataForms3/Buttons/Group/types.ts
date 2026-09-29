import DataManager from "../../DataManager";
import type { GroupingFieldTreeNode } from "./ListSettingsModal/shared/types";

export type { GroupingFieldTreeNode };

export interface Props {
    DataManager?: DataManager;
    description?: string;
    title?: string;
}

export interface State {
    fields: GroupingFieldTreeNode[];
    loading: boolean;
}