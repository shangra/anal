import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MoveRowButtons } from 'components/MetadataForms/Buttons/MoveRowButtons';


describe('MoveRowButtons', () => {
    test('renders buttons correctly', () => {
        render(
            <MoveRowButtons
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                canMoveUp
                canMoveDown
            />
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toEqual(2);
    });

    test('calls the correct handler when button is clicked', async () => {
        const mockOnMoveUp = jest.fn();
        const mockOnMoveDown = jest.fn();

        render(
            <MoveRowButtons
                onMoveUp={mockOnMoveUp}
                onMoveDown={mockOnMoveDown}
                canMoveUp
                canMoveDown
            />
        );

        await userEvent.click(screen.getAllByRole('button')[0]);
        expect(mockOnMoveUp).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getAllByRole('button')[1]);
        expect(mockOnMoveDown).toHaveBeenCalledTimes(1);
    });

    test('disables buttons if cannot move', () => {
        render(
            <MoveRowButtons
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                canMoveUp={false}
                canMoveDown={false}
            />
        );

        const buttons = screen.getAllByRole('button');

        expect(buttons[0]).toBeDisabled();

        expect(buttons[1]).toBeDisabled();
    });
});