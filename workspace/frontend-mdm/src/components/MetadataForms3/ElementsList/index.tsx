import { Component, type ReactNode } from 'react'
import { ErrorBoundary } from '../../ErrorBoundary'
import { generateLogsFileName } from '../Inputs/utils'
import { ElementsListContent } from './ElementListContent';
import type { IElementsListProps } from './types'

export type { IElementsListProps } from './types'
export { ElementsListContent } from './ElementListContent';


export class ElementsList extends Component<IElementsListProps> {
    render(): ReactNode {
        const { DataManager: _dataManager, ...propsWithoutDataManager } = this.props;

        return (
            <ErrorBoundary
                downloadLogs={{ logObj: { props: propsWithoutDataManager, state: {} }, 
                fileName: generateLogsFileName('MetadataForms_ELementsList_ElementsList') }}
            >
                <ElementsListContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
