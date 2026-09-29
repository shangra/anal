import { useEffect, useState } from "react";
import { withRouter } from "../../HOC/withRouter";
import { BreadCrumbsComponentProps, PagesResponse, IBasePage } from "./types"
import $api from "../../../helpers/axios";
import { useNavigate } from "react-router-dom";
import { BreadcrumbItem, Breadcrumbs, Typography } from "ui-kit";

const BreadCrumbs = ({ location, rootPageId }: BreadCrumbsComponentProps) => {
    const [page, setPage] = useState<IBasePage | null>();
    const [routes, setRoutes] = useState<BreadcrumbItem[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        initPage();
    }, []);

    useEffect(() => {
        initRoutes();
    }, [page]);

    const initRoutes = async () => {
        if (!page?.id) {
            setRoutes([{ label: '/', path: '/' }]);
            return;
        }

        const response = await $api.get<IBasePage, PagesResponse>(`/dynpage/breadcrumbs/${page.id}`);

        const rootPageIdIndex = response.data.findIndex((page) => page.id === rootPageId);

        const pagesData = rootPageIdIndex >= 0 ? response.data.slice(rootPageIdIndex) : response.data;

        setRoutes(pagesData.map((page) => ({
                label: page.description || page.name,
                path: `/${page.uri}`,
                pageId: page.id,
                onClick: () => handleLinkClick(`/${page.uri}`),
            })) ?? []);
    }

    const initPage = async () => {
        const pathName = location.pathname.replace(/^\/+|\/+$/g, '');
        if (!pathName) {
            return;
        }
        const response = await $api.get<IBasePage, PagesResponse>(`/pages`, {
            params: { filter: JSON.stringify({ where: { uri: pathName } }) }
        });

        if (response.data.length) {
            const pageByUri = response.data.find(({ uri }) => uri === pathName);
            if (pageByUri) {
                setPage(pageByUri);
            }
        } else {
            setPage(null);
        }
    }

    const handleLinkClick = (href: string) => {
        navigate(href);
    };

    if (page === null) return <Typography>Ошибка</Typography>

    return (
        routes.length ? <Breadcrumbs items={routes} maxItems={5} /> : <Typography>Загрузка...</Typography>
    )
}

export default withRouter(BreadCrumbs);