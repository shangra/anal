import $api from 'helpers/axios';
import type { RankItem } from 'components/RankEditor/types';
import { buildUrl } from 'helpers/buildUrl';

const getRankUrl = (server: string, classId: string, parentId: string) =>
    buildUrl(server, `metadata/rank/${classId}/${parentId}`);

interface FetchRankingListResponse {
    children: RankItem[];
}
export async function fetchRankingList(
    server: string,
    classId: string,
    parentId: string,
): Promise<FetchRankingListResponse> {
    const { data } = await $api.get<FetchRankingListResponse>(getRankUrl(server, classId, parentId));
    return data;
}

interface SaveRankListResponse {
    result: boolean;
}
export async function saveRankList(
    server: string,
    classId: string,
    parentId: string,
    children: RankItem[],
): Promise<boolean> {
    const { data } = await $api.put<SaveRankListResponse>(getRankUrl(server, classId, parentId), children);
    return data.result;
}
