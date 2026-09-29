import { IsolatedBreadCrumbs } from "../Features/IsolatedBreadCrumbs";
import { PageHeaderProps } from "./types";
import style from "./styles.module.css";
import { Tab, Tabs, Typography } from "ui-kit";

const PageHeader = ({ rootPageId, title, tabs, currentTab, onSetTab, actions }: PageHeaderProps) => (
        <div className={style.headerWrapper}>
            <div className={style.header}>
                <IsolatedBreadCrumbs rootPageId={rootPageId} />
                <div className={style.titleSection}>
                    <Typography variant="heading4" className={style.headerTitle}>{title}</Typography>
                    <div className={style.actions}>
                        {/* TODO: через actions компоненты не рендерятся */}
                        {actions}
                    </div>
                </div>
                {
                    tabs && (
                        <div className={style.tabsSection}>
                            <Tabs value={currentTab} onChange={onSetTab} >
                                {tabs.map((tab) => <Tab label={tab.label}>{tab.children}</Tab>)}
                            </Tabs>
                        </div>
                    )
                }
            </div>
        </div>
    )

export default PageHeader;