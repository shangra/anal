import { Component, type ReactNode } from 'react';
import { Input, TextArea, Stack } from 'ui-kit';

interface ParsedAnswer {
    status: string;
    statusText: string;
    headers: string;
    body: string;
}

interface LogDetailProps {
    data: string;
}

interface LogDetailState {
    parsed: ParsedAnswer;
}

/**
 * Содержимое вложенного модального окна «Сообщение от сервера».
 *
 * Парсит JSON `data` (ответ HTTP-сервиса) и показывает поля:
 * status, statusText, headers, body.
 *
 * По аналогии с `panel/src/components/Worker/WorkerDetail/ItemLog.js`
 * и старым `MetadataForms/Buttons/Logs/LogsWindow/LogDetail`.
 */
export class LogDetail extends Component<LogDetailProps, LogDetailState> {
    constructor(props: LogDetailProps) {
        super(props);
        this.state = { parsed: { status: '', statusText: '', headers: '', body: '' } };
    }

    componentDidMount() {
        this.parseData();
    }

    componentDidUpdate(prevProps: LogDetailProps) {
        if (prevProps.data !== this.props.data) {
            this.parseData();
        }
    }

    parseData = () => {
        const { data } = this.props;
        if (!data) {
            this.setState({ parsed: { status: '', statusText: '', headers: '', body: '' } });
            return;
        }

        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            this.setState({
                parsed: {
                    status: String(parsed.status ?? ''),
                    statusText: String(parsed.statusText ?? ''),
                    headers:
                        typeof parsed.headers === 'object' && parsed.headers !== null
                            ? JSON.stringify(parsed.headers, null, '    ')
                            : String(parsed.headers ?? ''),
                    body:
                        typeof parsed.data === 'object' && parsed.data !== null
                            ? JSON.stringify(parsed.data, null, '    ')
                            : String(parsed.data ?? ''),
                },
            });
        } catch (err) {
            // Не валидный JSON — все поля пустые (как в оригинале)
            // eslint-disable-next-line no-console
            console.warn('LogDetail: answer is not valid JSON', data, err);
            this.setState({ parsed: { status: '', statusText: '', headers: '', body: '' } });
        }
    };

    render(): ReactNode {
        const { parsed } = this.state;

        return (
            <Stack direction="row" gap="16px" wrap="wrap">
                <Stack style={{ flex: '1 1 300px' }} gap="4px">
                    <span style={{ fontWeight: 600, color: 'var(--ui-kit-text-primary-color)' }}>Status</span>
                    <Input value={parsed.status} disabled fullWidth aria-label="Status" />
                </Stack>
                <Stack style={{ flex: '1 1 300px' }} gap="4px">
                    <span style={{ fontWeight: 600, color: 'var(--ui-kit-text-primary-color)' }}>StatusText</span>
                    <Input value={parsed.statusText} disabled fullWidth aria-label="StatusText" />
                </Stack>
                <Stack style={{ flex: '1 1 100%' }} gap="4px">
                    <span style={{ fontWeight: 600, color: 'var(--ui-kit-text-primary-color)' }}>Headers</span>
                    <TextArea
                        value={parsed.headers}
                        disabled
                        fullWidth
                        style={{ minHeight: '120px' }}
                        aria-label="Headers"
                    />
                </Stack>
                <Stack style={{ flex: '1 1 100%' }} gap="4px">
                    <span style={{ fontWeight: 600, color: 'var(--ui-kit-text-primary-color)' }}>Body</span>
                    <TextArea
                        value={parsed.body}
                        disabled
                        fullWidth
                        style={{ minHeight: '200px' }}
                        aria-label="Body"
                    />
                </Stack>
            </Stack>
        );
    }
}
