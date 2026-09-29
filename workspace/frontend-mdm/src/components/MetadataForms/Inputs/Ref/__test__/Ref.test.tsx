import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Ref } from '../index';

const defaultProps = {
    value: { value: 'some-id', label: 'Some text' },
    placeholder: 'Выберите элемент',
    onChange: jest.fn(),
    onClear: jest.fn(),
    readOnly: false,
} as any;

// Мок для DataManager (чтобы избежать импорта on-change)
jest.mock('../../../DataManager', () => {
    class MockApiManager {
        options = { limit: 200 };
        metadata = {};
    }
    return {
        default: MockApiManager,
        ApiManager: MockApiManager,
        MetaRefs: {},
        meta: {},
    };
});

jest.mock('../../../../../helpers/axios', () => ({
    get: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Ref', () => {
    it('должен отобразить default placeholder', () => {
        render(<Ref {...defaultProps} metaRef={{ value: null }} />);

        expect(
            screen.getByPlaceholderText('Выберите элемент')
        ).toBeInTheDocument();
    });

    it('должен отобразить default text', () => {
        render(<Ref {...defaultProps} metaRef={{ value: null }} />);

        expect(screen.getByDisplayValue('Some text')).toBeInTheDocument();
    });
});
