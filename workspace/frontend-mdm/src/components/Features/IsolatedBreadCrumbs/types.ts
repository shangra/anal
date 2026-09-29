import { AxiosResponse } from 'axios';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

export type BreadCrumbsType = {
    rootPageId?: string;
};

export type BreadCrumbsComponentProps = BreadCrumbsType & {
    location: ReturnType<typeof useLocation>;
    navigator: ReturnType<typeof useNavigate>;
    searchParams: ReturnType<typeof useSearchParams>;
    params: ReturnType<typeof useParams>;
};

export type PagesResponse = AxiosResponse<IBasePage[], { data: IBasePage[] }>;

export type BreadcrumbsResponse = AxiosResponse<IBasePage[], { data: IBasePage[] }>;

export type BreadcrumbRoute = {
    label: string;
    path: string;
};


export interface IBasePage {
    parent: string;
    id: string;
    name: string;
    description: string;
    rank: number;
    uri: string;
    urifind: string;
    active: number;
    content_type: string;
    template: string;
    link: string;
    markdel: number;
    createdAt: string;
    updatedAt: string;
    countChildren: number;
}

export interface IPage extends IBasePage {
    PageParams: {
        id: string;
        TemplateParam: {
            name: string;
        };
    }[];
}

export interface ITreeDataItem {
    key: string;
    title: string;

    isExpanded?: boolean;
    isLoading?: boolean;
    children?: ITreeDataItem[];
    payload: {
        parent: IPage;
        page: IPage;
    };
}
