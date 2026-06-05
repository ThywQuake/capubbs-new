import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LegacyBbsDataProvider } from './api/LegacyBbsDataContext';
import { App } from './App';
import './styles/index.css';
import { installThreadFrameFontStyles } from './styles/threadFrameFonts';

installThreadFrameFontStyles();

function getRouterBasename() {
  const baseUrl = import.meta.env.BASE_URL;

  if (!baseUrl || baseUrl === '/') {
    return undefined;
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
    },
    {
      path: '/user-center',
      element: <App />,
    },
    {
      path: '/users/:userSlug',
      element: <App />,
    },
    {
      path: '/users',
      element: <App />,
    },
    {
      path: '/search',
      element: <App />,
    },
    {
      path: '/calendar-admin',
      element: <App />,
    },
    {
      path: '/stats',
      element: <App />,
    },
    {
      path: '/archive',
      element: <App />,
    },
    {
      path: '/login',
      element: <App />,
    },
    {
      path: '/register',
      element: <App />,
    },
    {
      path: '/boards/:boardName',
      element: <App />,
    },
    {
      path: '/threads/:threadId',
      element: <App />,
    },
    {
      path: '*',
      element: <App />,
    },
  ],
  {
    basename: getRouterBasename(),
  },
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <LegacyBbsDataProvider>
    <RouterProvider router={router} />
  </LegacyBbsDataProvider>,
);
