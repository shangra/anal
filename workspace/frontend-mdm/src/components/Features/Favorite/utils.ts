import StateManager from 'lite-react-statemanager';
import { AxiosResponse } from 'axios'
import $api from '../../../helpers/axios';
import { Favorite } from './types';

export const FAVORITES_API = {
    getAll(): Promise<Favorite> {
        return $api.get<Favorite>('/favorites');
    },

    async getIsFavorite(link: string ): Promise<boolean> {
        const link64 = encodeURIComponent(btoa(link));
        
        const response = await $api.get<{ result: boolean}, AxiosResponse<{ result: boolean}>, { flashOff: boolean}>(`/favorites/${link64}`, { data: { flashOff: true }});

        const isFavorite: boolean = response.data.result || false

        return isFavorite;
    },

    toggleIsFavorite(isFavorite: boolean, data: { link: string, icon: string, title: string }): Promise<void> {
        const { link, icon, title } = data;

        if (isFavorite) {
            return this.setFavorite(icon, title, link);
        } 
            return this.delete(link);
        
    },

    async setFavorite(icon: string, title: string, link: string): Promise<void> {
        await $api.post('/favorites', { icon, title, link })

        StateManager.setState({
            flash: {
                show: true,
                content: 'Добавлено в избранное',
            },
        });
    },

    async delete(link: string): Promise<void> {
        const link64 = encodeURIComponent(btoa(link));
        
        await $api.delete(`/favorites/${link64}`)

        StateManager.setState({
            flash: {
                show: true,
                content: 'Удалено из избранного',
            },
        })
    },
} as const;