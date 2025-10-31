/**
 * Language Selector Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSelector } from '@/components/translation/LanguageSelector';

describe('LanguageSelector', () => {
  const mockOnLanguageChange = jest.fn();

  beforeEach(() => {
    mockOnLanguageChange.mockClear();
  });

  it('should render with current language', () => {
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByPlaceholderText('Search languages...')).toBeInTheDocument();
  });

  it('should show search input when showSearch is true', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        showSearch={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByPlaceholderText('Search languages...')).toBeInTheDocument();
  });

  it('should hide search input when showSearch is false', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        showSearch={false}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.queryByPlaceholderText('Search languages...')).not.toBeInTheDocument();
  });

  it('should filter languages based on search query', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        showSearch={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search languages...');
    await user.type(searchInput, 'hindi');

    await waitFor(() => {
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });
  });

  it('should group languages by region when enabled', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        groupByRegion={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByText('Indian Languages')).toBeInTheDocument();
    expect(screen.getByText('International Languages')).toBeInTheDocument();
  });

  it('should call onLanguageChange when language is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const hindiOption = screen.getByText('हिन्दी');
    await user.click(hindiOption);

    expect(mockOnLanguageChange).toHaveBeenCalledWith('hi');
  });

  it('should show check mark for current language', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="hi"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const hindiOption = screen.getByRole('option', { name: /हिन्दी/ });
    expect(hindiOption).toHaveAttribute('aria-selected', 'true');
  });

  it('should close dropdown when language is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const hindiOption = screen.getByText('हिन्दी');
    await user.click(hindiOption);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search languages...')).not.toBeInTheDocument();
    });
  });

  it('should close dropdown when backdrop is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Click outside the dropdown
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search languages...')).not.toBeInTheDocument();
    });
  });

  it('should show no results message when search has no matches', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        showSearch={true}
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search languages...');
    await user.type(searchInput, 'nonexistentlanguage');

    await waitFor(() => {
      expect(screen.getByText(/No languages found matching/)).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
        className="custom-class"
      />
    );

    const container = screen.getByRole('combobox').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('should be accessible with keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <LanguageSelector
        currentLanguage="en"
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    
    // Open with Enter key
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByPlaceholderText('Search languages...')).toBeInTheDocument();

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(mockOnLanguageChange).toHaveBeenCalled();
  });
});