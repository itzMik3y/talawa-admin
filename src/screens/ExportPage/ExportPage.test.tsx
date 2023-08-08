import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/react-testing';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import ExportPage from './ExportPage';
import { store } from 'state/store';
import userEvent from '@testing-library/user-event';
import i18nForTest from 'utils/i18nForTest';
import 'jest-location-mock';
import { ORGANIZATIONS_MEMBER_CONNECTION_LIST_MOCKS } from './ExportPageMocks';

async function wait(ms = 500): Promise<void> {
  await act(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  });
}

describe('Testing Export Page', () => {
  test('Components should be rendered properly', async () => {
    window.location.assign('/exportpage');

    render(
      <MockedProvider
        mocks={ORGANIZATIONS_MEMBER_CONNECTION_LIST_MOCKS}
        addTypename={false}
      >
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <ExportPage />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>
    );

    await wait();

    expect(screen.getByText('Search By Name')).toBeInTheDocument();
    expect(screen.getByText('List of Exports')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    expect(window.location).toBeAt('/exportpage');
  });

  test('Testing search functionality', async () => {
    window.location.assign('/exportpage');

    render(
      <MockedProvider
        mocks={ORGANIZATIONS_MEMBER_CONNECTION_LIST_MOCKS}
        addTypename={false}
      >
        <BrowserRouter>
          <Provider store={store}>
            <I18nextProvider i18n={i18nForTest}>
              <ExportPage />
            </I18nextProvider>
          </Provider>
        </BrowserRouter>
      </MockedProvider>
    );

    await wait();

    const searchInput = screen.getByPlaceholderText(/Enter Name/i);

    userEvent.type(searchInput, 'Nonexistent User');

    expect(searchInput).toHaveValue('Nonexistent User');

    await wait(700);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();

    expect(window.location).toBeAt('/exportpage');
  });
});
