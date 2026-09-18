import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RuleBetweenInput } from 'components/DRQueryBuilder/components/Rule/components/RuleBetweenInput';
import { MetaField } from 'components/DRQueryBuilder/types';

jest.mock('../components/Rule/components/RuleBaseInput', () => ({
  RuleBaseInput: jest.fn(({ value, handleChange, placeholder, type }) => (
    <input
      data-testid={`rule-base-input-${placeholder.toLowerCase()}`}
      value={value || ''}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      type={type}
    />
  )),
}));

describe('RuleBetweenInput', () => {
  const defaultProps = {
    type: 'string' as MetaField['type'],
    value: ['startValue', 'endValue'] as [string, string],
    handleChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders component with passed values', () => {
    render(<RuleBetweenInput {...defaultProps} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    expect(RuleBaseInput).toHaveBeenCalledTimes(2);
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        value: 'startValue',
        placeholder: 'От',
        type: 'string'
      }),
      {}
    );
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        value: 'endValue',
        placeholder: 'До',
        type: 'string'
      }),
      {}
    );
  });

  it('renders component with null values', () => {
    const props = {
      ...defaultProps,
      value: [null, null] as [string | null, string | null],
    };
    // @ts-ignore
    render(<RuleBetweenInput {...props} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        value: null,
        placeholder: 'От',
      }),
      {}
    );
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        value: null,
        placeholder: 'До',
      }),
      {}
    );
  });

  it('calls handleChange when first field changes', () => {
    const handleChange = jest.fn();
    const props = {
      ...defaultProps,
      handleChange,
    };

    render(<RuleBetweenInput {...props} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    const firstCall = RuleBaseInput.mock.calls[0][0];
    firstCall.handleChange('newStart');

    expect(handleChange).toHaveBeenCalledWith(['newStart', 'endValue']);
  });

  it('calls handleChange when second field changes', () => {
    const handleChange = jest.fn();
    const props = {
      ...defaultProps,
      handleChange,
    };

    render(<RuleBetweenInput {...props} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    const secondCall = RuleBaseInput.mock.calls[1][0];
    secondCall.handleChange('newEnd');

    expect(handleChange).toHaveBeenCalledWith(['startValue', 'newEnd']);
  });

  it('passes correct props to RuleBaseInput components', () => {
    render(<RuleBetweenInput {...defaultProps} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    expect(RuleBaseInput).toHaveBeenCalledTimes(2);
    
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'string',
        value: 'startValue',
        placeholder: 'От',
      }),
      {}
    );

    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'string',
        value: 'endValue',
        placeholder: 'До',
      }),
      {}
    );
  });

  it('renders with different MetaField types', () => {
    const numberProps = {
      ...defaultProps,
      type: 'number' as MetaField['type'],
    };

    render(<RuleBetweenInput {...numberProps} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    expect(RuleBaseInput).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'number',
      }),
      {}
    );
  });

  it('correctly handles empty strings as null', () => {
    const props = {
      ...defaultProps,
      value: ['', ''] as [string, string],
    };

    render(<RuleBetweenInput {...props} />);

    const {RuleBaseInput} = jest.requireMock('../components/Rule/components/RuleBaseInput');
    
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        value: '',
        placeholder: 'От',
      }),
      {}
    );
    expect(RuleBaseInput).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        value: '',
        placeholder: 'До',
      }),
      {}
    );
  });
});