import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InputsList } from '..';

const originalError = console.error;
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('ReactDOMTestUtils.act')) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});

jest.mock('./InputsList.module.css', () => ({
    wrapper: 'wrapper',
}));

describe('InputsList Component', () => {
    it('should render children correctly', () => {
        const testChildren = [
            <input key="1" type="text" placeholder="Input 1" />,
            <input key="2" type="password" placeholder="Input 2" />,
            <button key="3">Submit</button>
        ];

        render(<InputsList>{testChildren}</InputsList>);

        expect(screen.getByPlaceholderText('Input 1')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Input 2')).toBeInTheDocument();
        expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('should render with empty children array', () => {
        const { container } = render(<InputsList>{[]}</InputsList>);

        const wrapper = container.querySelector('.wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(wrapper).toBeEmptyDOMElement();
    });

    it('should render with single child', () => {
        render(
            <InputsList>
                {[<input key="1" type="email" placeholder="Email" />]}
            </InputsList>
        );

        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });

    it('should have correct CSS class', () => {
        const { container } = render(
            <InputsList>
                {[<div key="1">Test child</div>]}
            </InputsList>
        );

        const wrapper = container.querySelector('.wrapper');
        expect(wrapper).toHaveClass('wrapper');
    });

    it('should render mixed children types', () => {
        const mixedChildren = [
            <div key="1">Text element</div>,
            <span key="2">Span element</span>,
            <input key="3" type="number" />,
            <select key="4">
                <option>Option 1</option>
            </select>
        ];

        render(<InputsList>{mixedChildren}</InputsList>);

        expect(screen.getByText('Text element')).toBeInTheDocument();
        expect(screen.getByText('Span element')).toBeInTheDocument();
        expect(screen.getByRole('spinbutton')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render correct DOM structure', () => {
        const { container } = render(
            <InputsList>
                {[<input key="1" type="text" />]}
            </InputsList>
        );

        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('wrapper');
        expect(wrapper).toContainElement(screen.getByRole('textbox'));
    });
});