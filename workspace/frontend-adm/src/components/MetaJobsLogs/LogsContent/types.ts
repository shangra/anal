export interface JobInfo {
    id: string;
    name?: string;
    description?: string;
    schedule?: string;
    method?: string;
    service?: string;
    status: number;
}

export interface LogEntry {
    id: string;
    code: number;
    jobName: string;
    jobId: string;
    answer: string;
    status: number;
    createdAt: string;
}
