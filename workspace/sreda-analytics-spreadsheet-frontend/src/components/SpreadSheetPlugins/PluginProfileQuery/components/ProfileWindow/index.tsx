import { FC, useEffect, useMemo, useState } from 'react';

import $api from '../../../../../helpers/axios';
import { IPluginProfileQueryRequest } from '../../types';
import ProfileWindowView from '../ProfileWindowView/ProfileWindowView';

interface IProfileWindowProps {
    requests: IPluginProfileQueryRequest[];
    server?: string;
    /** Вызывается при монтировании — включает режим профилирования */
    onOpen: () => void;
    /** Вызывается при размонтировании — выключает режим профилирования */
    onClose: () => void;
    /** Вызывается при очистке списка запросов */
    onClear: () => void;
}

/**
 * Окно профилировщика запросов.
 *
 * Читает `requests` напрямую из plugin state через usePluginState —
 * устраняет анти-паттерн прямой мутации ProfileWindowRef.current.setState(),
 * который использовался в старой архитектуре.
 */
const ProfileWindow: FC<IProfileWindowProps> = ({ requests, server, onOpen, onClose, onClear }) => {
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);
    const [metaCache, setMetaCache] = useState<Record<string, { loading: boolean; data: any; error: string | null }>>({});
    const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        onOpen();
        return () => onClose();
    }, []);

    // Таймер проверки TTL
    useEffect(() => {
        // Собираем запросы с TTL, которые ещё не протухли
        const activeRequests = requests.filter((req) => {
            if (!req.expiresAt) return false;
            if (expiredIds.has(req.answerId)) return false;
            return true;
        });

        if (activeRequests.length === 0) {
            return;
        }

        const checkExpired = () => {
            const now = Date.now();
            const newExpiredIds = new Set(expiredIds);
            let hasNewExpired = false;

            activeRequests.forEach((req) => {
                if (!req.expiresAt) return;

                if (now >= req.expiresAt && !expiredIds.has(req.answerId)) {
                    newExpiredIds.add(req.answerId);
                    hasNewExpired = true;
                }
            });

            if (hasNewExpired) {
                setExpiredIds(newExpiredIds);
            }
        };

        // Проверяем сразу
        checkExpired();

        // И раз в 30 секунд
        const interval = setInterval(checkExpired, 30 * 1000);

        // eslint-disable-next-line consistent-return
        return () => clearInterval(interval);
    }, [requests, expiredIds]);

    const requestsWithMetrics = useMemo(
        () =>
            requests.map((req, i) => {
                const plan = req.plan ?? { steps: [] };
                const steps = plan.steps ?? [];
                const first = steps[0]?.date ? new Date(steps[0].date).getTime() : 0;
                const last = steps[steps.length - 1]?.date ? new Date(steps[steps.length - 1].date).getTime() : 0;
                let rows = 0;
                let qTime = 0;
                let isCompleted = false;

                steps.forEach((s) => {
                    const m = s.message.match(/количество строк:\s*(\d+)/);
                    if (m) rows = parseInt(m[1]);
                    const t = s.message.match(/время выполнения:\s*([\d.]+)/);
                    if (t) qTime = parseFloat(t[1]);
                    if (s.message.includes('Закончили формировать таблицу')) {
                        isCompleted = true;
                    }
                });

                // Проверяем наличие ошибок в шагах
                const hasError = steps.some((s: any) => s.hasError);
                const isExpired = expiredIds.has(req.answerId);

                return {
                    answerId: req.answerId,
                    requestId: req.requestId,
                    plan,
                    index: i + 1,
                    startTime: first,
                    endTime: last,
                    duration: last - first,
                    rowCount: rows,
                    queryTime: qTime,
                    isCompleted: isCompleted || hasError,
                    hasError,
                    error: req.error,
                    isExpired,
                };
            }),
        [requests, expiredIds],
    );

    const handleStepClick = async (context: string) => {
        if (selectedContext === context) {
            setSelectedContext(null);
            return;
        }
        setSelectedContext(context);

        if (metaCache[context]) return;

        setMetaCache((prev) => ({ ...prev, [context]: { loading: true, data: null, error: null } }));
        try {
            const res = await $api.get(`${server ?? ''}metadata/query-explain/meta/${context}`);
            setMetaCache((prev) => ({ ...prev, [context]: { loading: false, data: res.data, error: null } }));
        } catch (e: any) {
            setMetaCache((prev) => ({ ...prev, [context]: { loading: false, data: null, error: e.message || 'Ошибка' } }));
        }
    };

    return (
        <ProfileWindowView
            requests={requestsWithMetrics}
            expandedRequest={expandedRequest}
            selectedContext={selectedContext}
            metaCache={metaCache}
            onToggleRequest={setExpandedRequest}
            onStepClick={handleStepClick}
            onClear={onClear}
        />
    );
};

export default ProfileWindow;
