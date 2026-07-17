import '@testing-library/jest-dom';

global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);
