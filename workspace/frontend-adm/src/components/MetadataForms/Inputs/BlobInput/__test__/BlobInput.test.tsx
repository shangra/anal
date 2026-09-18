import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BlobInput } from 'components/MetadataForms/Inputs/BlobInput';


const mockOnChange = jest.fn();

const defaultProps = {
    name: 'blob',
    value: '87uikj-vgt567-vgyu-987uyhj-98yhk00000',
    onChange: mockOnChange,
} as any;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('BlobInput', () => {
    it('должен отобразить сообщение об ошибке при невозможности определить название файла', () => {
        render(<BlobInput {...defaultProps} />);

        expect(
            screen.getByDisplayValue(
                'Не удалось определить название файла с uuid 87uikj-vgt567-vgyu-987uyhj-98yhk00000',
            ),
        ).toBeInTheDocument();
    });
});