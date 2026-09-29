import type { CSSProperties, ReactNode } from "react"
import { ErrorBoundary } from "../../../ErrorBoundary"
import { generateLogsFileName } from "../../Inputs/utils"

const shellStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
}

interface TableShellProps {
    logName: string
    logProps: unknown
    logState: unknown
    bodyOverflow?: 'hidden' | 'auto'
    children: ReactNode
}

export function TableShell({
    logName,
    logProps,
    logState,
    bodyOverflow = 'hidden',
    children,
}: TableShellProps) {
    return (
        <ErrorBoundary
            downloadLogs={{
                logObj: { props: logProps, state: logState },
                fileName: generateLogsFileName(logName),
            }}
        >
            <div style={shellStyle}>
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflow: bodyOverflow,
                    }}
                >
                    {children}
                </div>
            </div>
        </ErrorBoundary>
    )
}