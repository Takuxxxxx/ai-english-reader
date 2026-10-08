import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import ArticleList from "./pages/ArticleList";
import ArticleView from "./pages/ArticleView";
import Vocabulary from "./pages/Vocabulary";
import Settings from "./pages/Settings";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "topics/:name", element: <ArticleList /> },
      { path: "articles/:id", element: <ArticleView /> },
      { path: "vocabulary", element: <Vocabulary /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
