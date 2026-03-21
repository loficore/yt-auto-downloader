import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { MantineProvider, createTheme } from '@mantine/core';
import { render as rtlRender, queries, Queries } from '@testing-library/react';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'sans-serif',
});

const customRender = <Q extends Queries = typeof queries>(
  ui: React.ReactElement,
  options?: Parameters<typeof rtlRender<Q>>[1],
) => {
  return rtlRender<Q>(ui, {
    wrapper: ({ children }) => (
      <MantineProvider theme={theme}>{children}</MantineProvider>
    ),
    ...options,
  });
};

export * from '@testing-library/react';
export { customRender as render };
