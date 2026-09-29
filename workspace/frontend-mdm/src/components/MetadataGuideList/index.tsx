import React, { useState, useEffect } from 'react';
import { Typography, IconButton } from 'ui-kit';
import style from './style.module.css';
import $api from '../../helpers/axios.jsx';
import { selectedEntityActions } from '../../helpers/selected-entity.helper';

interface IMetadataGuideListProps {
    title: string;
    groupsId: string;
    onClick: (...args: any[]) => void;
}

export const MetadataGuideList: React.FC<IMetadataGuideListProps> = ({
    title,
    groupsId,
    onClick,
}) => {
    const handleClick = (title: string, name: string, url: string, id: string) => () => {
        selectedEntityActions.setSelectedEntity(title, name, id, groupsId);
        onClick(name, url, id);
    };

    const [guideList, setList] = useState([]);

    const getElements = (groupsId: string) => {
        const url = `/metadata/interface/${groupsId}`;
        $api.get(url).then((res) => {
            //@ts-ignore
            const data = res.data.map((element) => {
                return {
                    id: element?.id,
                    name: element?.name,
                    url: element?.url,
                    description: element?.description,
                };
            });

            setList(data);
        });
    };

    useEffect(() => {
        getElements(groupsId);
    }, [groupsId]);

    return (
        <div className={style.list_wrapper}>
            <div className={style.list_header}>
                <Typography variant='heading5' className={style.list_title}>
                    {title}
                </Typography>
            </div>

            <div className={style.list_scrollable}>
                {guideList?.map(({ id, name, url, description }) => (
                    <div
                        key={id}
                        className={style.list_item}
                        onClick={handleClick(title, description, url, id)}
                    >
                        <Typography
                            variant='body'
                            fontWeight='light'
                            className={style.list_item_link}
                        >
                            {description}
                        </Typography>
                    </div>
                ))}
            </div>
        </div>
    );
};
