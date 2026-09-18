import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import $api from '../../helpers/axios';

const CUBES_CLASS_ID = '4d0cb622-60fc-40db-97d6-be103b26051e';
const REPORTS_CLASS_ID = '04e89fcd-82f0-4d17-afab-d6ab35a10c83';

export function adminPanelUrl(): string {
    if (process.env.REACT_APP_ADMIN_URL) return process.env.REACT_APP_ADMIN_URL;
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3372/adminpanel`;
}

type MetaNode = {
    id: string;
    class?: string;
    class_id?: string;
    name?: string;
    description?: string;
};

function isInstance(node: MetaNode, className: string, classId: string): boolean {
    return Boolean(node.id && node.class === className && node.id !== classId && node.id !== node.class_id);
}

export function CubeSelect() {
    const [cubes, setCubes] = useState<MetaNode[]>([]);
    const [reports, setReports] = useState<MetaNode[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            $api.get(`/metadata/link/${CUBES_CLASS_ID}`),
            $api.get(`/metadata/link/${REPORTS_CLASS_ID}`).catch(() => ({ data: [] })),
        ])
            .then(([cubeRes, reportRes]) => {
                setCubes((Array.isArray(cubeRes.data) ? cubeRes.data : []).filter((n) => isInstance(n, 'Cubes', CUBES_CLASS_ID)));
                setReports(
                    (Array.isArray(reportRes.data) ? reportRes.data : []).filter((n) => isInstance(n, 'Reports', REPORTS_CLASS_ID)),
                );
            })
            .catch((e) => setError(e?.message || 'Не удалось загрузить список'))
            .finally(() => setLoading(false));
    }, []);

    const adminUrl = adminPanelUrl();

    return (
        <div
            style={{
                minHeight: '100vh',
                padding: '48px 32px',
                maxWidth: 880,
                margin: '0 auto',
                boxSizing: 'border-box',
            }}
        >
            <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Среда Аналитика</h1>
            <p style={{ margin: '0 0 28px', opacity: 0.75, lineHeight: 1.5 }}>
                Здесь открывают куб или отчёт и строят срез. Слои, меры и измерения настраивают в админке.
            </p>

            <a
                href={adminUrl}
                style={{ display: 'inline-block', marginBottom: 32, color: 'inherit', fontWeight: 600 }}
            >
                Открыть админку →
            </a>

            {loading && <div>Загрузка…</div>}
            {error && <div>{error}</div>}

            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Кубы</h2>
            {!loading && cubes.length === 0 && (
                <p style={{ opacity: 0.75, marginTop: 0 }}>
                    Кубов нет. Создайте объект в админке: Кубы → добавьте инфосервис, меры и измерения.
                </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                {cubes.map((cube) => (
                    <Link
                        key={cube.id}
                        to={`/cube?cubeId=${encodeURIComponent(cube.id)}&description=${encodeURIComponent(cube.name || cube.id)}`}
                        style={{
                            display: 'block',
                            padding: '14px 16px',
                            border: '1px solid currentColor',
                            borderRadius: 8,
                            textDecoration: 'none',
                            color: 'inherit',
                            opacity: 0.95,
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>{cube.name || 'Без имени'}</div>
                        <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Открыть таблицу куба</div>
                    </Link>
                ))}
            </div>

            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Отчёты</h2>
            {!loading && reports.length === 0 && <p style={{ opacity: 0.75, marginTop: 0 }}>Отчётов пока нет.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map((report) => (
                    <Link
                        key={report.id}
                        to={`/report?reportId=${encodeURIComponent(report.id)}&description=${encodeURIComponent(report.name || report.id)}`}
                        style={{
                            display: 'block',
                            padding: '14px 16px',
                            border: '1px solid currentColor',
                            borderRadius: 8,
                            textDecoration: 'none',
                            color: 'inherit',
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>{report.name || 'Без имени'}</div>
                        <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Открыть отчёт</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
