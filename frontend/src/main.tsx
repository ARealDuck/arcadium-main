import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from "react-router"

import "@fontsource/sanchez"
import "@fontsource/archivo-black"
import "@fontsource-variable/jetbrains-mono"

import "./index.css"
import HomePage from './Pages/HomePage.tsx'
import Layout from './Layout.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import Login from './Pages/Login.tsx'
import RequireAuth from './Components/General/RequireAuth.tsx'
import { RequireOnboarded } from './Components/General/RequireOnboarded.tsx'
import Register from './Pages/Register.tsx'
import MatchPrep from './Pages/MatchPrep.tsx'
import MatchPage from './Pages/MatchPage.tsx'
import { TierProvider } from './hooks/useTiers.tsx'
import ProfilePage from './Pages/ProfilePage.tsx'
import OnboardingPage from './Pages/OnboardingPage.tsx'
import { ActiveMatchProvider } from './hooks/useActiveMatch.tsx'
import VerifyPage from './Pages/VerifyPage.tsx'

// Has to be done to use useActiveMatch within layout. ActiveMatchProvider has to be within Router for useLocation, so we can refresha activematch upon route switch.
function ActiveMatchRoute() {
  return (
    <ActiveMatchProvider>
      <Outlet/>
    </ActiveMatchProvider>
  )
}

const router = createBrowserRouter([
  {
    path: "/login", element: <Login />
  },
  {
    path: "/register", element: <Register />
  },
  {
    element: <RequireAuth/>,
    children: [
      {
        path: "/onboarding", 
        element: <OnboardingPage />
      },
      {
        element: <RequireOnboarded />,
        children: [
          {
            element: <ActiveMatchRoute />,
            children: [
              {
                path: "/",
                element: <Layout />,
                children: [
                  { index: true, element: <HomePage />},
                  { path: "prep/:game/:playtype/:ladder", element: <MatchPrep />},
                  { path: "match/:id", element: <MatchPage />},
                  { path: "/profile/:id", element: <ProfilePage /> }
                ]
              }

            ]

          }
        ]
      },
      {
        path: "/verify",
        element: <VerifyPage />
      }

    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TierProvider>
      <AuthProvider>
        <RouterProvider router={router}/>
      </AuthProvider>
    </TierProvider>
  </StrictMode>,
)
